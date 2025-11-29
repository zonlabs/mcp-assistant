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
  private _codeVerifier?: string;
  private _state?: string;
  private _onRedirect: (url: URL) => void;

  constructor(
    private readonly _redirectUrl: string | URL,
    private readonly _clientMetadata: OAuthClientMetadata,
    onRedirect?: (url: URL) => void,
    state?: string
  ) {
    this._onRedirect =
      onRedirect ||
      ((url) => {
        console.log(`Redirect to: ${url.toString()}`);
      });
    this._state = state;
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
    this._tokens = tokens;
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
