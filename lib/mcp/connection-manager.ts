/**
 * Connection Manager for orchestrating multiple MCP connections per user
 * Follows the Cloudflare agents pattern with event-based state management
 * Designed for serverless architecture - no persistent connections
 */

import { MCPClient } from './oauth-client';
import { sessionStore, type SessionData } from './session-store';
import { Emitter, type McpConnectionEvent, type McpObservabilityEvent, DisposableStore, type McpConnectionState } from './events';
import type { McpServer, ToolInfo } from '@/types/mcp';

export interface ConnectionInfo {
  sessionId: string;
  serverId: string;
  serverName: string;
  client: MCPClient;
  state: McpConnectionState;
  tools: ToolInfo[];
  error?: string;
  connectedAt?: Date;
}

export interface ConnectOptions {
  server: McpServer;
  callbackUrl: string;
  onAuthRequired?: (authUrl: string) => void;
}

/**
 * Manages all MCP connections for a single user
 * Aggregates events from individual clients and provides a unified interface
 */
export class ConnectionManager {
  private userId: string;
  private connections: Map<string, ConnectionInfo> = new Map();
  private disposables: Map<string, DisposableStore> = new Map();

  // Event emitters
  private readonly _onConnectionEvent = new Emitter<McpConnectionEvent>();
  public readonly onConnectionEvent = this._onConnectionEvent.event;

  private readonly _onObservabilityEvent = new Emitter<McpObservabilityEvent>();
  public readonly onObservabilityEvent = this._onObservabilityEvent.event;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Initialize all connections from Redis sessions
   * Validates and restores existing sessions for the user
   */
  async initializeFromSessions(): Promise<void> {
    try {
      const sessions = await sessionStore.getUserSessionsData(this.userId);

      this._onObservabilityEvent.fire({
        level: 'info',
        message: `Initializing ${sessions.length} sessions from Redis`,
        metadata: { sessionCount: sessions.length },
        timestamp: Date.now(),
      });

      for (const session of sessions) {
        if (!session.active || !session.serverId) {
          continue;
        }

        try {
          await this.restoreSession(session);
        } catch (error) {
          console.warn(`[ConnectionManager] Failed to restore session ${session.sessionId}:`, error);
          // Continue with other sessions
        }
      }
    } catch (error) {
      console.error('[ConnectionManager] Failed to initialize from sessions:', error);
      this._onObservabilityEvent.fire({
        level: 'error',
        message: 'Failed to initialize sessions from Redis',
        metadata: { error: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Restore a session from Redis and validate it
   * @private
   */
  private async restoreSession(session: SessionData): Promise<void> {
    const { sessionId, serverId, serverName } = session;

    if (!serverId) {
      throw new Error('Session missing serverId');
    }

    // Create client
    const client = new MCPClient({
      userId: this.userId,
      sessionId,
      serverId,
      serverName,
    });

    // Store connection info
    const connectionInfo: ConnectionInfo = {
      sessionId,
      serverId,
      serverName: serverName || serverId,
      client,
      state: 'VALIDATING',
      tools: [],
    };

    this.connections.set(sessionId, connectionInfo);

    // Subscribe to client events
    this.subscribeToClient(sessionId, client);

    // Validate the session
    await this.validateSession(sessionId);
  }

  /**
   * Subscribe to events from an MCPClient
   * @private
   */
  private subscribeToClient(sessionId: string, client: MCPClient): void {
    const disposableStore = new DisposableStore();

    // Subscribe to connection events
    disposableStore.add(
      client.onConnectionEvent((event) => {
        // Update local state
        const connection = this.connections.get(sessionId);
        if (connection) {
          if (event.type === 'state_changed') {
            connection.state = event.state;

            if (event.state === 'FAILED' && 'error' in event) {
              connection.error = event.error;
            }
          } else if (event.type === 'tools_discovered') {
            connection.tools = event.tools as ToolInfo[];
          }
        }

        // Forward event to manager subscribers
        this._onConnectionEvent.fire(event);
      })
    );

    // Subscribe to observability events
    disposableStore.add(
      client.onObservabilityEvent((event) => {
        this._onObservabilityEvent.fire(event);
      })
    );

    this.disposables.set(sessionId, disposableStore);
  }

  /**
   * Connect to a new MCP server
   */
  async connect(options: ConnectOptions): Promise<string> {
    const { server, callbackUrl, onAuthRequired } = options;
    const sessionId = sessionStore.generateSessionId();

    this._onObservabilityEvent.fire({
      level: 'info',
      message: `Connecting to ${server.name}`,
      metadata: { serverId: server.id, sessionId },
      timestamp: Date.now(),
    });

    // Create client
    const client = new MCPClient({
      userId: this.userId,
      sessionId,
      serverId: server.id,
      serverName: server.name,
      serverUrl: server.url,
      callbackUrl,
      transportType: server.transport as 'sse' | 'streamable_http',
      onRedirect: onAuthRequired,
    });

    // Store connection info
    const connectionInfo: ConnectionInfo = {
      sessionId,
      serverId: server.id,
      serverName: server.name,
      client,
      state: 'CONNECTING',
      tools: [],
    };

    this.connections.set(sessionId, connectionInfo);

    // Subscribe to client events
    this.subscribeToClient(sessionId, client);

    // Attempt connection
    try {
      await client.connect();

      // If successful, discover tools
      await this.discoverTools(sessionId);

      connectionInfo.connectedAt = new Date();
    } catch (error) {
      // Error events are already emitted by client
      throw error;
    }

    return sessionId;
  }

  /**
   * Complete OAuth authentication for a session
   */
  async finishAuth(sessionId: string, authCode: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    await connection.client.finishAuth(authCode);

    // Discover tools after authentication
    await this.discoverTools(sessionId);

    connection.connectedAt = new Date();
  }

  /**
   * Validate an existing session by fetching tools
   */
  async validateSession(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Update state
      connection.state = 'VALIDATING';

      // Try to reconnect if not connected
      if (!connection.client.isConnected()) {
        await connection.client.reconnect();
      }

      // Fetch tools to validate
      await this.discoverTools(sessionId);

      connection.state = 'CONNECTED';
    } catch (error) {
      connection.state = 'FAILED';
      connection.error = error instanceof Error ? error.message : 'Validation failed';

      // Remove invalid session
      await sessionStore.removeSession(this.userId, sessionId);
      this.connections.delete(sessionId);

      throw error;
    }
  }

  /**
   * Discover tools for a connection
   * @private
   */
  private async discoverTools(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const result = await connection.client.listTools();
    connection.tools = result.tools as ToolInfo[];
  }

  /**
   * Disconnect from a server
   */
  async disconnect(sessionId: string): Promise<void> {
    const connection = this.connections.get(sessionId);
    if (!connection) {
      return;
    }

    this._onObservabilityEvent.fire({
      level: 'info',
      message: `Disconnecting from ${connection.serverName}`,
      sessionId,
      serverId: connection.serverId,
      timestamp: Date.now(),
    });

    // Clear session from Redis
    await connection.client.clearSession();

    // Dispose client
    connection.client.dispose();

    // Dispose subscriptions
    const disposables = this.disposables.get(sessionId);
    if (disposables) {
      disposables.dispose();
      this.disposables.delete(sessionId);
    }

    // Remove from connections
    this.connections.delete(sessionId);
  }

  /**
   * Get connection info by session ID
   */
  getConnection(sessionId: string): ConnectionInfo | undefined {
    return this.connections.get(sessionId);
  }

  /**
   * Get connection by server ID
   */
  getConnectionByServerId(serverId: string): ConnectionInfo | undefined {
    for (const connection of this.connections.values()) {
      if (connection.serverId === serverId) {
        return connection;
      }
    }
    return undefined;
  }

  /**
   * Get all connections
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get all connected sessions (state === CONNECTED)
   */
  getConnectedSessions(): ConnectionInfo[] {
    return this.getAllConnections().filter((c) => c.state === 'CONNECTED');
  }

  /**
   * Check if a server is connected
   */
  isServerConnected(serverId: string): boolean {
    const connection = this.getConnectionByServerId(serverId);
    return connection?.state === 'CONNECTED';
  }

  /**
   * Get tools for a session
   */
  getTools(sessionId: string): ToolInfo[] {
    return this.connections.get(sessionId)?.tools || [];
  }

  /**
   * Get connection state
   */
  getConnectionState(sessionId: string): McpConnectionState | undefined {
    return this.connections.get(sessionId)?.state;
  }

  /**
   * Dispose all connections and cleanup
   */
  dispose(): void {
    for (const [sessionId, disposables] of this.disposables) {
      disposables.dispose();
    }

    for (const connection of this.connections.values()) {
      connection.client.dispose();
    }

    this.connections.clear();
    this.disposables.clear();
    this._onConnectionEvent.dispose();
    this._onObservabilityEvent.dispose();
  }
}
