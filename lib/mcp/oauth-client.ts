import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { UnauthorizedError as SDKUnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
import {
  ListToolsRequest,
  ListToolsResult,
  ListToolsResultSchema,
  CallToolRequest,
  CallToolResult,
  CallToolResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { OAuthClientMetadata } from '@modelcontextprotocol/sdk/shared/auth.js';
import { InMemoryOAuthClientProvider } from './oauth-provider';

/**
 * Supported MCP transport types
 */
export type TransportType = 'sse' | 'streamable_http';

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

  constructor(
    private serverUrl: string,
    private callbackUrl: string,
    private onRedirect: (url: string) => void,
    sessionId?: string,
    transportType: TransportType = 'streamable_http'
  ) {
    this.sessionId = sessionId;
    this.transportType = transportType;
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
      // Use standard OpenID Connect scopes that work with most OAuth providers
      // Some servers might support 'mcp:tools', but most use standard scopes
      // scope: '',
    };

    this.oauthProvider = new InMemoryOAuthClientProvider(
      this.callbackUrl,
      clientMetadata,
      (redirectUrl: URL) => {
        this.onRedirect(redirectUrl.toString());
      },
      this.sessionId // Pass sessionId as the state parameter
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
      await this.client.connect(this.transport);
    } catch (error) {
      // Check if it's the SDK's UnauthorizedError or contains 'unauthorized' in message
      if (error instanceof SDKUnauthorizedError ||
          (error instanceof Error && error.message.toLowerCase().includes('unauthorized'))) {
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
}
