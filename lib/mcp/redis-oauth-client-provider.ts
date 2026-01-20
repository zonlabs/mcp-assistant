import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
    OAuthClientInformation,
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthTokens
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { nanoid } from "nanoid";
import { redis } from "./redis";

const STATE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL = 43200; // 12 hours

interface StoredState {
    nonce: string;
    serverId: string;
    createdAt: number;
}

// A slight extension to the standard OAuthClientProvider interface because `redirectToAuthorization` doesn't give us the interface we need
// This allows us to track authentication for a specific server and associated dynamic client registration
export interface AgentsOAuthProvider extends OAuthClientProvider {
    authUrl: string | undefined;
    clientId: string | undefined;
    serverId: string | undefined;
    checkState(
        state: string
    ): Promise<{ valid: boolean; serverId?: string; error?: string }>;
    consumeState(state: string): Promise<void>;
    deleteCodeVerifier(): Promise<void>;
}

export class RedisOAuthClientProvider implements AgentsOAuthProvider {
    private _authUrl_: string | undefined;
    private _clientId_: string | undefined;
    private _onRedirect?: (url: string) => void;
    private _tokenExpiresAt?: number;
    private _sessionId?: string;

    constructor(
        public userId: string,
        public serverId: string,
        public clientName: string,
        public baseRedirectUrl: string,
        onRedirect?: (url: string) => void,
        sessionId?: string
    ) {
        this._onRedirect = onRedirect;
        this._sessionId = sessionId;
    }

    get clientMetadata(): OAuthClientMetadata {
        return {
            client_name: this.clientName,
            client_uri: this.clientUri,
            grant_types: ["authorization_code", "refresh_token"],
            redirect_uris: [this.redirectUrl],
            response_types: ["code"],
            token_endpoint_auth_method: "none",
            ...(this._clientId_ ? { client_id: this._clientId_ } : {})
        };
    }

    get clientUri() {
        return new URL(this.redirectUrl).origin;
    }

    get redirectUrl() {
        return this.baseRedirectUrl;
    }

    get clientId() {
        return this._clientId_;
    }

    set clientId(clientId_: string | undefined) {
        this._clientId_ = clientId_;
    }

    // Single key for all data - MUST match SessionStore key structure
    oauthDataKey() {
        return `mcp:server:${this.userId}:${this.serverId}`;
    }

    // Load all OAuth data from Redis
    private async loadOAuthData(): Promise<{
        clientInformation?: OAuthClientInformationFull;
        tokens?: OAuthTokens;
        codeVerifier?: string;
        clientId?: string;
    }> {
        const data = await redis.get(this.oauthDataKey());
        if (!data) return {};
        try {
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    // Save all OAuth data to Redis (merge with existing session data)
    private async saveOAuthData(data: {
        clientInformation?: OAuthClientInformationFull;
        tokens?: OAuthTokens;
        codeVerifier?: string;
        clientId?: string;
    }): Promise<void> {
        // Load existing data first to preserve session metadata
        const existingData = await redis.get(this.oauthDataKey());
        const existingSession = existingData ? JSON.parse(existingData) : {};

        // Merge OAuth data with existing session data
        const mergedData = {
            ...existingSession,
            ...data,
        };

        // Use setex with the standard session TTL to ensure consistency
        await redis.setex(this.oauthDataKey(), SESSION_TTL, JSON.stringify(mergedData));
    }

    async clientInformation(): Promise<OAuthClientInformation | undefined> {
        const data = await this.loadOAuthData();

        // Also restore clientId from data if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        return data.clientInformation;
    }

    async saveClientInformation(
        clientInformation: OAuthClientInformationFull
    ): Promise<void> {
        const data = await this.loadOAuthData();
        data.clientInformation = clientInformation;
        data.clientId = clientInformation.client_id;
        await this.saveOAuthData(data);
        this.clientId = clientInformation.client_id;
    }

    async saveTokens(tokens: OAuthTokens): Promise<void> {
        const data = await this.loadOAuthData();
        data.tokens = tokens;

        // Calculate and store token expiration
        if (tokens.expires_in) {
            const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
            this._tokenExpiresAt = Date.now() + (tokens.expires_in * 1000) - bufferMs;
        }

        await this.saveOAuthData(data);
    }

    get authUrl() {
        return this._authUrl_;
    }

    stateKey(nonce: string) {
        return `mcp:server:${this.userId}:${this.serverId}:state:${nonce}`;
    }

    async state(): Promise<string> {
        // If sessionId was provided, use it as the state
        if (this._sessionId) {
            return this._sessionId;
        }

        // Otherwise generate new state (for backward compatibility)
        const nonce = nanoid();
        const state = `${nonce}.${this.serverId}`;
        const storedState: StoredState = {
            nonce,
            serverId: this.serverId,
            createdAt: Date.now()
        };
        await redis.set(
            this.stateKey(nonce),
            JSON.stringify(storedState),
            "PX",
            STATE_EXPIRATION_MS
        );
        return state;
    }

    async checkState(
        state: string
    ): Promise<{ valid: boolean; serverId?: string; error?: string }> {
        const parts = state.split(".");
        if (parts.length !== 2) {
            return { valid: false, error: "Invalid state format" };
        }

        const [nonce, serverId] = parts;
        const key = this.stateKey(nonce);
        const data = await redis.get(key);

        if (!data) {
            return { valid: false, error: "State not found or already used" };
        }

        const storedState = JSON.parse(data) as StoredState;

        if (storedState.serverId !== serverId) {
            // Don't delete here, just return error. Let expiration handle it or explicit consumption.
            // But for security, maybe we should? The original code deleted it.
            await redis.del(key);
            return { valid: false, error: "State serverId mismatch" };
        }

        // Redis handles expiration, but double check just in case logic changes
        const age = Date.now() - storedState.createdAt;
        if (age > STATE_EXPIRATION_MS) {
            await redis.del(key);
            return { valid: false, error: "State expired" };
        }

        return { valid: true, serverId };
    }

    async consumeState(state: string): Promise<void> {
        const parts = state.split(".");
        if (parts.length !== 2) {
            console.warn(
                `[OAuth] consumeState called with invalid state format: ${state.substring(0, 20)}...`
            );
            return;
        }
        const [nonce] = parts;
        await redis.del(this.stateKey(nonce));
    }

    async redirectToAuthorization(authUrl: URL): Promise<void> {
        this._authUrl_ = authUrl.toString();
        if (this._onRedirect) {
            this._onRedirect(authUrl.toString());
        }
    }

    async invalidateCredentials(
        scope: "all" | "client" | "tokens" | "verifier"
    ): Promise<void> {
        if (scope === "all") {
            await redis.del(this.oauthDataKey());
        } else {
            const data = await this.loadOAuthData();
            if (scope === "client") {
                delete data.clientInformation;
                delete data.clientId;
            } else if (scope === "tokens") {
                delete data.tokens;
            } else if (scope === "verifier") {
                delete data.codeVerifier;
            }
            await this.saveOAuthData(data);
        }
    }

    async saveCodeVerifier(verifier: string): Promise<void> {
        const data = await this.loadOAuthData();
        // Always overwrite verifier to ensure the latest one is used for the current flow
        console.log(`[OAuth] Saving code verifier for server ${this.serverId}`);
        data.codeVerifier = verifier;
        await this.saveOAuthData(data);
    }

    async codeVerifier(): Promise<string> {
        const data = await this.loadOAuthData();

        // Lazy-load clientId if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        if (!data.codeVerifier) {
            throw new Error("No code verifier found");
        }
        return data.codeVerifier;
    }

    async deleteCodeVerifier(): Promise<void> {
        const data = await this.loadOAuthData();
        delete data.codeVerifier;
        await this.saveOAuthData(data);
    }

    async tokens(): Promise<OAuthTokens | undefined> {
        const data = await this.loadOAuthData();

        // Lazy-load clientId if we don't have it
        if (data.clientId && !this._clientId_) {
            this._clientId_ = data.clientId;
        }

        return data.tokens;
    }

    /**
     * Check if the current access token is expired or about to expire
     */
    isTokenExpired(): boolean {
        if (!this._tokenExpiresAt) {
            return false; // No expiration tracking
        }
        return Date.now() >= this._tokenExpiresAt;
    }

    /**
     * Set token expiration timestamp
     */
    setTokenExpiresAt(expiresAt: number): void {
        this._tokenExpiresAt = expiresAt;
    }
}
