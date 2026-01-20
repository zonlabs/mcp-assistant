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
import { RedisOAuthClientProvider, AgentsOAuthProvider } from './redis-oauth-client-provider';
import { sessionStore } from './session-store';

/**
 * Supported MCP transport types
 */
export type TransportType = 'sse' | 'streamable_http';

export interface MCPOAuthClientOptions {
  serverUrl: string;
  serverName?: string;
  callbackUrl: string;
  onRedirect: (url: string) => void;
  userId: string;
  serverId: string;
  sessionId?: string;
  transportType?: TransportType;
  tokens?: OAuthTokens;
  tokenExpiresAt?: number;
  clientInformation?: OAuthClientInformationFull;
  clientId?: string;
  clientSecret?: string;
  onSaveTokens?: (tokens: OAuthTokens) => void;
  headers?: Record<string, string>;
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
 * MCP Client
 *
 * Manages connection to MCP servers with OAuth 2.0 authentication,
 * tool discovery, and tool execution.
 */
export class MCPClient {
  private client: Client | null = null;
  public oauthProvider: AgentsOAuthProvider | null = null; // Make public for session restoration
  private transport: StreamableHTTPClientTransport | SSEClientTransport | null = null;
  private userId: string;
  private serverId: string;
  private sessionId?: string;
  private serverName?: string;
  private transportType: TransportType;
  private serverUrl: string;
  private callbackUrl: string;
  private onRedirect: (url: string) => void;
  private tokens?: OAuthTokens;
  private tokenExpiresAt?: number;
  private clientInformation?: OAuthClientInformationFull;
  private clientId?: string;
  private clientSecret?: string;
  private onSaveTokens?: (tokens: OAuthTokens) => void;
  private headers?: Record<string, string>;

  constructor(
    options: MCPOAuthClientOptions
  ) {
    this.serverUrl = options.serverUrl;
    this.serverName = options.serverName;
    this.callbackUrl = options.callbackUrl;
    this.onRedirect = options.onRedirect;
    this.userId = options.userId;
    this.serverId = options.serverId;
    this.sessionId = options.sessionId;
    this.transportType = options.transportType || 'streamable_http';
    this.tokens = options.tokens;
    this.tokenExpiresAt = options.tokenExpiresAt;
    this.clientInformation = options.clientInformation;
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.onSaveTokens = options.onSaveTokens;
    this.headers = options.headers;

    // console.log('[MCPOAuthClient] Initializing with tokens:', this.tokens ? 'Yes' : 'No', this.tokens);
  }

  /**
   * Ensure that the client, transport, and provider are correctly initialized.
   * This is necessary because in serverless environments, the client may be
   * recreated for each request and needs to be set up from stored state.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.client && this.oauthProvider && this.transport) {
      return;
    }

    const clientMetadata: OAuthClientMetadata = {
      client_name: 'MCP Assistant',
      redirect_uris: [this.callbackUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_basic',
      client_uri: 'https://mcp-assistant.in',
      logo_uri: 'https://mcp-assistant.in/logo.png',
      policy_uri: 'https://mcp-assistant.in/privacy',
      software_id: 'mcp-assistant',
      software_version: '0.2.1',
      ...(this.clientId ? { client_id: this.clientId } : {}),
      ...(this.clientSecret ? { client_secret: this.clientSecret } : {}),
    };

    if (!this.oauthProvider) {
      this.oauthProvider = new RedisOAuthClientProvider(
        this.userId,
        this.serverId,
        clientMetadata.client_name ?? 'MCP Assistant',
        this.callbackUrl,
        (redirectUrl: string) => {
          console.log('[OAuth Client] Redirect URI:', redirectUrl);
          this.onRedirect(redirectUrl);
        },
        this.sessionId
      );

      if (this.clientId) {
        this.oauthProvider.clientId = this.clientId;
      }
    }

    if (!this.client) {
      this.client = new Client(
        {
          name: 'mcp-assistant-oauth-client',
          version: '2.0',
        },
        { capabilities: {} }
      );
    }

    if (!this.transport) {
      const baseUrl = new URL(this.serverUrl);
      if (this.transportType === 'sse') {
        this.transport = new SSEClientTransport(baseUrl, {
          authProvider: this.oauthProvider!,
          ...(this.headers && { headers: this.headers }),
        });
      } else {
        this.transport = new StreamableHTTPClientTransport(baseUrl, {
          authProvider: this.oauthProvider!,
          ...(this.headers && { headers: this.headers }),
        });
      }
    }
  }

  /**
   * Save the current session state to Redis
   */
  private async saveSession(active: boolean = true): Promise<void> {
    if (!this.sessionId || !this.serverId) return;

    console.log(`[MCPOAuthClient] Saving session (active=${active})`);
    await sessionStore.setClient({
      sessionId: this.sessionId,
      serverId: this.serverId,
      serverName: this.serverName,
      serverUrl: this.serverUrl,
      callbackUrl: this.callbackUrl,
      transportType: this.transportType,
      userId: this.userId,
      active,
    });
  }

  /**
   * Connect to the MCP server

   *
   * @throws {UnauthorizedError} If OAuth authorization is required
   * @throws {Error} For other connection errors
   */
  async connect(): Promise<void> {
    await this.ensureInitialized();
    await this.attemptConnection();
  }

  /**
   * Attempt to establish connection with the MCP server
   */
  private async attemptConnection(): Promise<void> {
    await this.ensureInitialized();

    if (!this.client || !this.transport) {
      throw new Error('Client or transport not initialized');
    }

    try {
      // Load existing tokens from Redis before attempting connection
      await this.getValidTokens();
      await this.client.connect(this.transport);

      // Connection successful, ensure session is saved as active
      await this.saveSession(true);
    } catch (error) {
      // Check if it's the SDK's UnauthorizedError or contains 'unauthorized' in message
      if (error instanceof SDKUnauthorizedError ||
        (error instanceof Error && error.message.toLowerCase().includes('unauthorized'))) {

        // Save session as inactive (requiring auth) to persist params
        await this.saveSession(false);
        throw new UnauthorizedError('OAuth authorization required');
      } else {
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
    await this.ensureInitialized();

    if (!this.oauthProvider || !this.transport) {
      throw new Error('OAuth provider or transport not initialized');
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
        authProvider: this.oauthProvider!,
        ...(this.headers && { headers: this.headers }),
      });
    } else {
      this.transport = new StreamableHTTPClientTransport(baseUrl, {
        authProvider: this.oauthProvider!,
        ...(this.headers && { headers: this.headers }),
      });
    }

    // Now connect with authenticated transport
    console.log('[OAuth Client] Connecting with authenticated transport...');
    await this.client.connect(this.transport);
    console.log('[OAuth Client] MCP session established, client ready');

    // Save active session
    await this.saveSession(true);
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
    // await this.getValidTokens();

    const request: ListToolsRequest = {
      method: 'tools/list',
      params: {},
    };

    return await this.client.request(request, ListToolsResultSchema);
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
    // await this.getValidTokens();

    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs,
      },
    };

    return await this.client.request(request, CallToolResultSchema);
  }

  /**
   * Refresh the access token using the refresh token
   *
   * @returns True if refresh was successful, false otherwise
   */
  async refreshToken(): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.oauthProvider) {
      console.error('[OAuth Client] Cannot refresh: OAuth provider not initialized');
      return false;
    }

    const tokens = await this.oauthProvider.tokens();
    if (!tokens || !tokens.refresh_token) {
      console.error('[OAuth Client] Cannot refresh: No refresh token available');
      return false;
    }

    const clientInformation = await this.oauthProvider.clientInformation();
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
      console.log('[OAuth Client] Discovered OAuth metadata:', authMetadata);
      console.log('[OAuth Client] Discovered auth server URL:', authServerUrl);
      console.log('[OAuth Client] Client information:', clientInformation);
      console.log('[OAuth Client] Refresh token:', tokens.refresh_token);

      // Use the MCP SDK's refreshAuthorization function
      const newTokens = await refreshAuthorization(authServerUrl, {
        metadata: authMetadata,
        clientInformation,
        refreshToken: tokens.refresh_token,
      });

      // Save the new tokens
      await this.oauthProvider.saveTokens(newTokens);

      /** saving tokens in oauthProvider (handling the case where server doesnt expose oauthprotected resource metadata which is required during initial authorization and refreshing tokens) */

      // Notify about token update
      // if (this.onSaveTokens) {
      //   this.onSaveTokens(newTokens);
      // }

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
    await this.ensureInitialized();

    if (!this.oauthProvider) {
      console.error('[OAuth Client] Cannot get valid tokens: OAuth provider not initialized');
      return false;
    }

    // Check if token is expired
    if (this.oauthProvider.isTokenExpired()) {
      console.log('[OAuth Client] Token expired, attempting refresh...');
      await this.refreshToken()
      console.log('[OAuth Client] after refresh token method');
      return true;
    }

    return true; // Token is still valid
  }

  /**
   * Reconnect using existing OAuth provider
   * Used for session restoration from Redis in serverless environments
   * Recreates client and transport without creating a new OAuth provider
   */
  async reconnect(): Promise<void> {
    await this.ensureInitialized();

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

  /**
   * Get additional data from the MCP server
   * Fetches server capabilities, prompts, resources, and resource templates
   * 
   * @returns Combined server metadata including capabilities, prompts, resources, etc.
   */
  async getAdditionalData(): Promise<{
    serverVersion?: any;
    serverCapabilities?: any;
    instructions?: string;
    prompts?: any[];
    resources?: any[];
    resourceTemplates?: any[];
    tools?: any[];
  }> {
    if (!this.client) {
      throw new Error('Not connected to server');
    }

    const result: {
      serverVersion?: any;
      serverCapabilities?: any;
      instructions?: string;
      prompts?: any[];
      resources?: any[];
      resourceTemplates?: any[];
      tools?: any[];
    } = {};

    try {
      // Get server version
      result.serverVersion = await this.client.getServerVersion()

      // Get server capabilities
      result.serverCapabilities = await this.client.getServerCapabilities()

      // Get instructions if supported
      result.instructions = await this.client.getInstructions()

      // List prompts if supported
      const promptsResponse = await this.client.listPrompts();
      result.prompts = (promptsResponse as any).prompts || [];

      // List resources if supported
      const resourcesResponse = await this.client.listResources();
      result.resources = (resourcesResponse as any).resources || [];

      // List resource templates if supported
      const templatesResponse = await this.client.listResourceTemplates();
      result.resourceTemplates = (templatesResponse as any).resourceTemplates || [];

      // List tools (already implemented but include for completeness)
      const toolsResponse = await this.listTools();
      result.tools = toolsResponse.tools || [];

      return result;
    } catch (error) {
      console.error('[getAdditionalData] Failed to retrieve additional data:', error);
      throw error;
    }
  }
}
