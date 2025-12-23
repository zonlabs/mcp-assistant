import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * In-memory OAuth provider implementation for MCP
 *
 * This provider implements the OAuthClientProvider interface and stores
 * OAuth state (tokens, client info, code verifier) in memory.
 *
 * Note: For production, persist this state in a database or Redis.
 */
export class InMemoryOAuthClientProvider implements OAuthClientProvider {
  private _clientInformation?: OAuthClientInformationFull;
  private _tokens?: OAuthTokens;
  private _tokenExpiresAt?: number; // Track when the token expires (timestamp in ms)
  private _codeVerifier?: string;
  private _state?: string;
  private _onRedirect: (url: URL) => void;

  constructor(
    private readonly _redirectUrl: string | URL,
    private readonly _clientMetadata: OAuthClientMetadata,
    onRedirect?: (url: URL) => void,
    state?: string,
    tokens?: OAuthTokens,
    clientInformation?: OAuthClientInformationFull,
    tokenExpiresAt?: number // Add clientInformation to constructor
  ) {
    // console.log('[InMemoryOAuthClientProvider] Initializing with tokens:', tokens ? 'Yes' : 'No', tokens);
    // console.log('[InMemoryOAuthClientProvider] clientInformation:', clientInformation);
    this._onRedirect =
      onRedirect ||
      ((url) => {
        console.log(`Redirect to: ${url.toString()}`);
      });
    this._state = state;
    this._tokens = tokens;
    this._clientInformation = clientInformation;
    this._tokenExpiresAt = tokenExpiresAt;
  }

  /**
   * Get the redirect URL for OAuth callbacks
   */
  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  /**
   * Get the OAuth client metadata
   */
  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  /**
   * Returns the OAuth state parameter (used to pass sessionId through OAuth flow)
   */
  state(): string {
    return this._state || '';
  }

  /**
   * Get the stored client information
   */
  clientInformation(): OAuthClientInformationMixed | undefined {
    return this._clientInformation;
  }

  /**
   * Save client information received from the authorization server
   */
  saveClientInformation(clientInformation: OAuthClientInformationFull): void {
    this._clientInformation = clientInformation;
  }

  /**
   * Get the stored OAuth tokens
   */
  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  /**
   * Save OAuth tokens after successful authorization
   */
  saveTokens(tokens: OAuthTokens): void {
    console.log('[InMemoryOAuthClientProvider] Saving new tokens:', tokens);
    this._tokens = tokens;

    // Calculate token expiration time if expires_in is provided
    // if (tokens.expires_in) {
    //   // expires_in is in seconds, convert to milliseconds
    //   // Subtract 5 minutes as a buffer to refresh before actual expiration
    //   const bufferMs = 5 * 60 * 1000; // 5 minutes
    //   this._tokenExpiresAt = Date.now() + (tokens.expires_in * 1000) - bufferMs;
    // } else {
    //   // If no expires_in, assume token expires in 1 hour (conservative default)
    //   this._tokenExpiresAt = Date.now() + (60 * 60 * 1000);
    // }
  }

  /**
   * Check if the current access token is expired or about to expire
   */
  isTokenExpired(): boolean {
    if (!this._tokens || !this._tokenExpiresAt) {
      console.log(`[InMemoryOAuthClientProvider] No tokens to expire ${this._tokens}, ${this._tokenExpiresAt}`);
      return false; // No tokens to expire
    }
    console.log(`[InMemoryOAuthClientProvider] checking Token expiry: ${Date.now()} ; ${this._tokenExpiresAt}`);
    return Date.now() >= this._tokenExpiresAt;
  }

  /**
   * Get the token expiration timestamp
   */
  getTokenExpiresAt(): number | undefined {
    return this._tokenExpiresAt;
  }

  /**
   * Handle redirect to authorization URL
   * This is called when user needs to authorize the application
   */
  redirectToAuthorization(authorizationUrl: URL): void {
    console.log('[OAuth Provider] Redirect to authorization:', authorizationUrl.toString());
    this._onRedirect(authorizationUrl);
  }

  /**
   * Save the PKCE code verifier for the authorization request
   */
  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
  }

  /**
   * Get the stored code verifier
   * Used during token exchange to verify the authorization code
   */
  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error('No code verifier saved');
    }
    return this._codeVerifier;
  }
}
