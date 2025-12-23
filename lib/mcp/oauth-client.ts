import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import {
  UnauthorizedError as SDKUnauthorizedError,
  refreshAuthorization,
  discoverOAuthProtectedResourceMetadata,
  discoverAuthorizationServerMetadata,
  auth
} from '@modelcontextprotocol/sdk/client/auth.js';
import {
  ListToolsRequest,
  ListToolsResult,
  ListToolsResultSchema,
  CallToolRequest,
  CallToolResult,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { OAuthClientMetadata, OAuthTokens, OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InMemoryOAuthClientProvider } from './oauth-provider';

/**
 * Supported MCP transport types
 */
export type TransportType = 'sse' | 'streamable_http';

export interface MCPOAuthClientOptions {
  serverUrl: string;
  callbackUrl: string;
  onRedirect: (url: string) => void;
  sessionId?: string;
  transportType?: TransportType;
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationFull;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Custom error for OAuth authorization requirements
 */
export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * MCP OAuth Client
 *
 * Manages connection to MCP servers with OAuth 2.0 authentication,
 * tool discovery, and tool execution.
 */
export class MCPOAuthClient {
  private client: Client | null = null;
  public oauthProvider: InMemoryOAuthClientProvider | null = null; // Make public for session restoration
  private transport: StreamableHTTPClientTransport | SSEClientTransport | null = null;
  private sessionId?: string;
  private transportType: TransportType;
  private serverUrl: string;
  private callbackUrl: string;
  private onRedirect: (url: string) => void;
  private tokens?: OAuthTokens;
  private clientInformation?: OAuthClientInformationFull;
  private clientId?: string;
  private clientSecret?: string;

  constructor(
    options: MCPOAuthClientOptions
  ) {
    this.serverUrl = options.serverUrl;
    this.callbackUrl = options.callbackUrl;
    this.onRedirect = options.onRedirect;
    this.sessionId = options.sessionId;
    this.transportType = options.transportType || 'streamable_http';
    this.tokens = options.tokens;
    this.clientInformation = options.clientInformation;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;

    // console.log('[MCPOAuthClient] Initializing with tokens:', this.tokens ? 'Yes' : 'No', this.tokens);
  }

  /**
   * Connect to the MCP server
   *
   * @throws {UnauthorizedError} If OAuth authorization is required
   * @throws {Error} For other connection errors
   */
  async connect(): Promise<void> {
    const clientMetadata: OAuthClientMetadata = {
      client_name: 'MCP Assistant',
      redirect_uris: [this.callbackUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
      client_uri: 'https://mcp-assistant.in',
      logo_uri: 'https://mcp-assistant.in/logo.png',

      // Legal
      // tos_uri: 'https://mcp-assistant.in/terms',
      policy_uri: 'https://mcp-assistant.in/privacy',

      // Optional software metadata (DCR)
      software_id: 'mcp-assistant',
      software_version: '0.2.1',

      // Use provided credentials if available
      ...(this.clientId ? { client_id: this.clientId } : {}),
      ...(this.clientSecret ? { client_secret: this.clientSecret } : {}),
    };

    this.oauthProvider = new InMemoryOAuthClientProvider(
      this.callbackUrl,
      clientMetadata,
      (redirectUrl: URL) => {
        console.log('[OAuth Client] Redirect URI:', redirectUrl.toString());

        this.onRedirect(redirectUrl.toString());
      },
      this.sessionId, // Pass sessionId as the state parameter
      this.tokens,
      this.clientInformation
    );

    this.client = new Client(
      {
        name: 'mcp-assistant-oauth-client',
        version: '2.0',
      },
      { capabilities: {} }
    );

    await this.attemptConnection();
  }

  /**
   * Attempt to establish connection with the MCP server
   */
  private async attemptConnection(): Promise<void> {
    if (!this.client || !this.oauthProvider) {
      throw new Error('Client not initialized');
    }

    const baseUrl = new URL(this.serverUrl);

    // Create appropriate transport based on type
    if (this.transportType === 'sse') {
      this.transport = new SSEClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    } else {
      this.transport = new StreamableHTTPClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    }

    try {
      await this.getValidTokens();
      await this.client.connect(this.transport);
    } catch (error) {
      // Check if it's the SDK's UnauthorizedError or contains 'unauthorized' in message
      if (error instanceof SDKUnauthorizedError ||
        (error instanceof Error && error.message.toLowerCase().includes('unauthorized'))) {

        console.log('[OAuth Client] Connection failed with 401, attempting token refresh...');
        const refreshed = await this.refreshToken();

        if (refreshed) {
          try {
            // Re-create transport with new tokens (just in case)
            // Actually transport uses oauthProvider which has new tokens now.
            await this.client.connect(this.transport);
            console.log('[OAuth Client] Reconnected after refresh');
            return;
          } catch (retryError) {
            console.error('[OAuth Client] Failed to reconnect after refresh:', retryError);
          }
        }

        throw new UnauthorizedError('OAuth authorization required');
      } else {
        // Enhance error message with URL info
        if (error instanceof Error) {
          throw new Error(`Failed to connect to ${this.serverUrl}: ${error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * Complete OAuth authorization with the authorization code
   *
   * @param authCode - Authorization code from OAuth callback
   */
  async finishAuth(authCode: string): Promise<void> {
    if (!this.oauthProvider) {
      throw new Error('OAuth provider not initialized');
    }

    console.log('[OAuth Client] Finishing OAuth authorization...');

    // Complete the OAuth flow - this exchanges the code for tokens
    // This updates the OAuth provider with valid tokens
    if (this.transport) {
      await this.transport.finishAuth(authCode);
      console.log('[OAuth Client] OAuth tokens exchanged successfully');
    }

    // Now create a fresh client and transport with the authenticated OAuth provider
    // The old client/transport were in a partial state from the failed initial connection
    console.log('[OAuth Client] Creating new authenticated client...');

    this.client = new Client(
      {
        name: 'mcp-assistant-oauth-client',
        version: '2.0',
      },
      { capabilities: {} }
    );

    const baseUrl = new URL(this.serverUrl);

    // Create appropriate transport based on type
    if (this.transportType === 'sse') {
      this.transport = new SSEClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    } else {
      this.transport = new StreamableHTTPClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    }

    // Now connect with authenticated transport
    console.log('[OAuth Client] Connecting with authenticated transport...');
    await this.client.connect(this.transport);
    console.log('[OAuth Client] MCP session established, client ready');
  }

  /**
   * List all available tools from the MCP server
   *
   * @returns List of tools with their names, descriptions, and input schemas
   */
  async listTools(): Promise<ListToolsResult> {
    if (!this.client) {
      throw new Error('Not connected to server');
    }

    // Get valid tokens before making request
    await this.getValidTokens();

    const request: ListToolsRequest = {
      method: 'tools/list',
      params: {},
    };

    try {
      return await this.client.request(request, ListToolsResultSchema);
    } catch (error) {
      // If unauthorized, try refreshing token once and retry
      if (error instanceof SDKUnauthorizedError ||
        (error instanceof Error && error.message.toLowerCase().includes('unauthorized'))) {
        console.log('[OAuth Client] Received 401, attempting token refresh...');
        const refreshed = await this.refreshToken();

        if (refreshed) {
          await this.reconnect();
          return await this.client.request(request, ListToolsResultSchema);
        }
      }
      throw error;
    }
  }

  /**
   * Call a tool on the MCP server
   *
   * @param toolName - Name of the tool to call
   * @param toolArgs - Arguments to pass to the tool
   * @returns Tool execution result
   */
  async callTool(
    toolName: string,
    toolArgs: Record<string, unknown>
  ): Promise<CallToolResult> {
    if (!this.client) {
      throw new Error('Not connected to server');
    }

    // Get valid tokens before making request
    await this.getValidTokens();

    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs,
      },
    };

    try {
      return await this.client.request(request, CallToolResultSchema);
    } catch (error) {
      // If unauthorized, try refreshing token once and retry
      if (error instanceof SDKUnauthorizedError ||
        (error instanceof Error && error.message.toLowerCase().includes('unauthorized'))) {
        console.log('[OAuth Client] Received 401, attempting token refresh...');
        const refreshed = await this.refreshToken();

        if (refreshed) {
          await this.reconnect();
          return await this.client.request(request, CallToolResultSchema);
        }
      }
      throw error;
    }
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @returns True if refresh was successful, false otherwise
   */
  async refreshToken(): Promise<boolean> {
    if (!this.oauthProvider) {
      console.error('[OAuth Client] Cannot refresh: OAuth provider not initialized');
      return false;
    }

    const tokens = this.oauthProvider.tokens();
    if (!tokens || !tokens.refresh_token) {
      console.error('[OAuth Client] Cannot refresh: No refresh token available');
      return false;
    }

    const clientInformation = this.oauthProvider.clientInformation();
    if (!clientInformation) {
      console.error('[OAuth Client] Cannot refresh: No client information available');
      return false;
    }

    try {
      console.log('[OAuth Client] Refreshing access token...');

      // Discover OAuth metadata from the server
      const resourceMetadata = await discoverOAuthProtectedResourceMetadata(this.serverUrl);
      const authServerUrl = resourceMetadata?.authorization_servers?.[0] || this.serverUrl;
      const authMetadata = await discoverAuthorizationServerMetadata(authServerUrl);

      // Use the MCP SDK's refreshAuthorization function
      const newTokens = await refreshAuthorization(authServerUrl, {
        metadata: authMetadata,
        clientInformation,
        refreshToken: tokens.refresh_token,
      });

      // Save the new tokens
      this.oauthProvider.saveTokens(newTokens);
      console.log('[OAuth Client] ✅ Token refresh successful');

      return true;
    } catch (error) {
      console.error('[OAuth Client] ❌ Token refresh failed:', error);
      return false;
    }
  }

  /**
   * Get valid tokens, refreshing if expired
   *
   * @returns True if tokens are valid (either not expired or successfully refreshed)
   */
  async getValidTokens(): Promise<boolean> {
    console.log('[OAuth Client] Checking token validity...');
    if (!this.oauthProvider) {
      console.error('[OAuth Client] Cannot get valid tokens: OAuth provider not initialized');
      return false;
    }

    // Check if token is expired
    if (this.oauthProvider.isTokenExpired()) {
      console.log('[OAuth Client] Token expired, attempting refresh...');
      const refreshed = await this.refreshToken();

      if (refreshed) {
        // Reconnect with new tokens
        await this.reconnect();
        return true;
      }

      return false;
    }

    return true; // Token is still valid
  }

  /**
   * Reconnect using existing OAuth provider
   * Used for session restoration from Redis in serverless environments
   * Recreates client and transport without creating a new OAuth provider
   */
  async reconnect(): Promise<void> {
    if (!this.oauthProvider) {
      throw new Error('OAuth provider not initialized');
    }

    // Create fresh client and transport with existing OAuth provider
    this.client = new Client(
      {
        name: 'mcp-assistant-oauth-client',
        version: '2.0',
      },
      { capabilities: {} }
    );

    const baseUrl = new URL(this.serverUrl);

    if (this.transportType === 'sse') {
      this.transport = new SSEClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    } else {
      this.transport = new StreamableHTTPClientTransport(baseUrl, {
        authProvider: this.oauthProvider,
      });
    }

    await this.client.connect(this.transport);
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  /**
   * Disconnect from the MCP server and cleanup resources
   */
  disconnect(): void {
    if (this.client) {
      // Close the client connection
      this.client.close();
    }
    this.client = null;
    this.oauthProvider = null;
    this.transport = null;
  }

  /**
   * Get the server URL
   */
  getServerUrl(): string {
    return this.serverUrl;
  }

  /**
   * Get the callback URL
   */
  getCallbackUrl(): string {
    return this.callbackUrl;
  }

  /**
   * Get the transport type
   */
  getTransportType(): TransportType {
    return this.transportType;
  }
}
