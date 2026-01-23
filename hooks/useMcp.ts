/**
 * useMcp Hook
 * Manages MCP connections with observable state pattern
 * Inspired by Cloudflare's agents pattern but adapted for serverless React apps
 *
 * Usage:
 * ```tsx
 * const { connections, connect, disconnect, isConnecting } = useMcp({ userId });
 *
 * // Subscribe to specific connection
 * const connection = connections.find(c => c.sessionId === 'abc');
 * console.log(connection.state); // CONNECTING, AUTHENTICATING, CONNECTED, etc.
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ConnectionManager, type ConnectionInfo } from '@/lib/mcp/connection-manager';
import { DisposableStore, type McpConnectionEvent, type McpConnectionState } from '@/lib/mcp/events';
// import { useMcpStore } from '@/lib/stores/mcp-store'; // Commented out - no localStorage dependency
import type { McpServer, ToolInfo } from '@/types/mcp';
import toast from 'react-hot-toast';

// Logging utility
const LOG_PREFIX = '[useMcp]';
const log = {
  info: (message: string, ...args: any[]) => {
    console.log(`${LOG_PREFIX} 📘 INFO:`, message, ...args);
  },
  success: (message: string, ...args: any[]) => {
    console.log(`${LOG_PREFIX} ✅ SUCCESS:`, message, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`${LOG_PREFIX} ❌ ERROR:`, message, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`${LOG_PREFIX} ⚠️  WARN:`, message, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`${LOG_PREFIX} 🔍 DEBUG:`, message, ...args);
  },
  event: (eventType: string, data: any) => {
    console.log(`${LOG_PREFIX} 📡 EVENT [${eventType}]:`, data);
  },
  state: (action: string, state: any) => {
    console.log(`${LOG_PREFIX} 🔄 STATE [${action}]:`, state);
  },
};

export interface UseMcpOptions {
  /**
   * User ID to manage connections for
   */
  userId: string;

  /**
   * Auto-initialize connections from Redis on mount
   * @default true
   */
  autoInitialize?: boolean;

  /**
   * Callback when a connection state changes
   */
  onStateChange?: (event: McpConnectionEvent) => void;

  /**
   * Callback for observability events (debugging)
   */
  onLog?: (level: string, message: string, metadata?: any) => void;
}

export interface McpConnection {
  sessionId: string;
  serverId: string;
  serverName: string;
  state: McpConnectionState;
  tools: ToolInfo[];
  error?: string;
  connectedAt?: Date;
}

export interface UseMcpReturn {
  /**
   * All connections for this user
   */
  connections: McpConnection[];

  /**
   * Connect to an MCP server
   */
  connect: (server: McpServer) => Promise<string>;

  /**
   * Disconnect from a server
   */
  disconnect: (sessionId: string) => Promise<void>;

  /**
   * Get connection by session ID
   */
  getConnection: (sessionId: string) => McpConnection | undefined;

  /**
   * Get connection by server ID
   */
  getConnectionByServerId: (serverId: string) => McpConnection | undefined;

  /**
   * Check if a server is connected
   */
  isServerConnected: (serverId: string) => boolean;

  /**
   * Get tools for a session
   */
  getTools: (sessionId: string) => ToolInfo[];

  /**
   * Whether the manager is initializing
   */
  isInitializing: boolean;

  /**
   * Whether any connection is in progress
   */
  isConnecting: boolean;

  /**
   * Refresh all connections (validate sessions)
   */
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing MCP connections with observable state
 */
export function useMcp(options: UseMcpOptions): UseMcpReturn {
  const { userId, autoInitialize = true, onStateChange, onLog } = options;

  log.info('Hook initialized with options:', { userId, autoInitialize });

  // Zustand store for persistence and global state (COMMENTED OUT - no localStorage)
  // const mcpStore = useMcpStore();

  // Connection manager instance (one per user)
  const managerRef = useRef<ConnectionManager | null>(null);
  const disposablesRef = useRef(new DisposableStore());

  // Local state for reactive updates
  const [connections, setConnections] = useState<McpConnection[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Initialize connection manager
   */
  useEffect(() => {
    if (!userId) {
      log.warn('No userId provided, skipping initialization');
      return;
    }

    log.info('Setting up ConnectionManager for user:', userId);

    // Create manager
    const manager = new ConnectionManager(userId);
    managerRef.current = manager;
    log.success('ConnectionManager created');

    // Subscribe to connection events
    const connectionEventDisposable = manager.onConnectionEvent((event) => {
      log.event(event.type, {
        sessionId: event.sessionId,
        serverId: event.serverId,
        ...(event.type === 'state_changed' && {
          state: event.state,
          previousState: event.previousState
        }),
        ...(event.type === 'tools_discovered' && {
          toolCount: event.toolCount
        }),
        ...(event.type === 'error' && {
          error: event.error,
          errorType: event.errorType
        }),
      });

      // Update local state based on event type
      updateConnectionsFromManager();

      // Sync with Zustand store (COMMENTED OUT - no localStorage)
      // syncWithStore(event);

      // Call user callback
      onStateChange?.(event);
    });

    disposablesRef.current.add(connectionEventDisposable);
    log.debug('Subscribed to connection events');

    // Subscribe to observability events
    const observabilityDisposable = manager.onObservabilityEvent((event) => {
      onLog?.(event.level, event.message, event.metadata);

      // Always log observability events in console with prefix
      const logFn = event.level === 'error' ? console.error :
                    event.level === 'warn' ? console.warn :
                    event.level === 'info' ? console.info :
                    console.log;
      logFn(`[MCP OBSERVABILITY ${event.level.toUpperCase()}]`, event.message, event.metadata);
    });

    disposablesRef.current.add(observabilityDisposable);
    log.debug('Subscribed to observability events');

    // Auto-initialize from Redis sessions
    if (autoInitialize) {
      log.info('Auto-initializing connections from Redis...');
      setIsInitializing(true);

      manager.initializeFromSessions()
        .then(() => {
          log.success('Sessions initialized from Redis');
          updateConnectionsFromManager();
        })
        .catch((error) => {
          log.error('Failed to initialize sessions:', error);
        })
        .finally(() => {
          setIsInitializing(false);
          log.debug('Initialization complete');
        });
    } else {
      log.info('Auto-initialize disabled, skipping Redis session load');
    }

    // Cleanup on unmount
    return () => {
      log.info('Cleaning up useMcp hook');
      disposablesRef.current.dispose();
      manager.dispose();
      managerRef.current = null;
      log.debug('Cleanup complete');
    };
  }, [userId, autoInitialize]); // Only recreate if userId changes

  /**
   * Update local connections state from manager
   */
  const updateConnectionsFromManager = useCallback(() => {
    if (!managerRef.current) {
      log.warn('updateConnectionsFromManager called but manager is null');
      return;
    }

    const managerConnections = managerRef.current.getAllConnections();
    log.debug('Updating connections from manager:', {
      count: managerConnections.length,
      connections: managerConnections.map(c => ({
        sessionId: c.sessionId,
        serverId: c.serverId,
        serverName: c.serverName,
        state: c.state,
        toolCount: c.tools.length,
      })),
    });

    const mcpConnections: McpConnection[] = managerConnections.map((conn) => ({
      sessionId: conn.sessionId,
      serverId: conn.serverId,
      serverName: conn.serverName,
      state: conn.state,
      tools: conn.tools,
      error: conn.error,
      connectedAt: conn.connectedAt,
    }));

    setConnections(mcpConnections);
    log.state('connections updated', {
      count: mcpConnections.length,
      states: mcpConnections.map(c => ({ id: c.sessionId.slice(0, 8), state: c.state })),
    });

    // Update isConnecting flag
    const hasConnecting = mcpConnections.some(
      (c) => c.state === 'CONNECTING' || c.state === 'AUTHENTICATING' || c.state === 'DISCOVERING'
    );
    setIsConnecting(hasConnecting);

    if (hasConnecting) {
      log.debug('Some connections are still in progress');
    }
  }, []);

  /**
   * Sync connection events with Zustand store
   * COMMENTED OUT - No localStorage dependency for now
   */
  // const syncWithStore = useCallback((event: McpConnectionEvent) => {
  //   if (event.type === 'state_changed') {
  //     // Update Zustand store connection status
  //     mcpStore.updateConnectionStatus(
  //       event.sessionId,
  //       event.state as any, // Map to ConnectionStatus
  //       undefined
  //     );
  //   } else if (event.type === 'tools_discovered') {
  //     // Update tools in Zustand store
  //     mcpStore.updateConnectionStatus(
  //       event.sessionId,
  //       'CONNECTED',
  //       event.tools as ToolInfo[]
  //     );
  //   } else if (event.type === 'error') {
  //     // Mark as failed in store
  //     mcpStore.updateConnectionStatus(event.sessionId, 'FAILED');
  //
  //     // Show error toast
  //     toast.error(`Connection error: ${event.error}`);
  //   } else if (event.type === 'auth_required') {
  //     // Update to authenticating
  //     mcpStore.updateConnectionStatus(event.sessionId, 'AUTHENTICATING');
  //   }
  // }, [mcpStore]);

  /**
   * Connect to an MCP server
   */
  const connect = useCallback(async (server: McpServer): Promise<string> => {
    log.info('Connect called for server:', {
      serverId: server.id,
      serverName: server.name,
      url: server.url,
      transport: server.transport,
    });

    if (!managerRef.current) {
      log.error('Connect failed: Connection manager not initialized');
      throw new Error('Connection manager not initialized');
    }

    const callbackUrl = `${window.location.origin}/api/mcp/auth/callback`;
    log.debug('Using callback URL:', callbackUrl);

    try {
      log.info('Initiating connection via ConnectionManager...');
      const sessionId = await managerRef.current.connect({
        server,
        callbackUrl,
        onAuthRequired: (authUrl) => {
          log.warn('OAuth authorization required:', { authUrl });
          toast.loading('Opening authorization window...', { id: 'auth' });
        },
      });

      log.success('Connection established with sessionId:', sessionId);

      // Update connections
      updateConnectionsFromManager();

      return sessionId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      log.error('Connection failed:', { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      toast.error(errorMessage);
      throw error;
    }
  }, [updateConnectionsFromManager]);

  /**
   * Disconnect from a server
   */
  const disconnect = useCallback(async (sessionId: string): Promise<void> => {
    log.info('Disconnect called for sessionId:', sessionId);

    if (!managerRef.current) {
      log.error('Disconnect failed: Connection manager not initialized');
      throw new Error('Connection manager not initialized');
    }

    try {
      const connection = managerRef.current.getConnection(sessionId);
      const serverName = connection?.serverName || 'unknown server';

      log.debug('Disconnecting from:', { sessionId, serverName });
      await managerRef.current.disconnect(sessionId);

      log.success('Disconnected from:', serverName);
      updateConnectionsFromManager();

      toast.success(`Disconnected from ${serverName}`);
    } catch (error) {
      log.error('Disconnect failed:', error);
      throw error;
    }
  }, [updateConnectionsFromManager]);

  /**
   * Refresh all connections (re-validate)
   */
  const refresh = useCallback(async (): Promise<void> => {
    log.info('Refresh called - re-validating all sessions from Redis');

    if (!managerRef.current) {
      log.warn('Refresh called but manager is null');
      return;
    }

    setIsInitializing(true);

    try {
      log.debug('Re-initializing from Redis sessions...');
      await managerRef.current.initializeFromSessions();

      log.success('Refresh completed successfully');
      updateConnectionsFromManager();
    } catch (error) {
      log.error('Refresh failed:', error);
      toast.error('Failed to refresh connections');
    } finally {
      setIsInitializing(false);
    }
  }, [updateConnectionsFromManager]);

  /**
   * Get connection by session ID
   */
  const getConnection = useCallback((sessionId: string): McpConnection | undefined => {
    const connection = connections.find((c) => c.sessionId === sessionId);
    log.debug('getConnection:', { sessionId, found: !!connection });
    return connection;
  }, [connections]);

  /**
   * Get connection by server ID
   */
  const getConnectionByServerId = useCallback((serverId: string): McpConnection | undefined => {
    const connection = connections.find((c) => c.serverId === serverId);
    log.debug('getConnectionByServerId:', { serverId, found: !!connection });
    return connection;
  }, [connections]);

  /**
   * Check if a server is connected
   */
  const isServerConnected = useCallback((serverId: string): boolean => {
    const connection = getConnectionByServerId(serverId);
    const isConnected = connection?.state === 'CONNECTED';
    log.debug('isServerConnected:', { serverId, isConnected, currentState: connection?.state });
    return isConnected;
  }, [getConnectionByServerId]);

  /**
   * Get tools for a session
   */
  const getTools = useCallback((sessionId: string): ToolInfo[] => {
    const connection = getConnection(sessionId);
    const tools = connection?.tools || [];
    log.debug('getTools:', { sessionId, toolCount: tools.length });
    return tools;
  }, [getConnection]);

  // Log current state summary
  useEffect(() => {
    log.state('Current state summary', {
      totalConnections: connections.length,
      isInitializing,
      isConnecting,
      connectionStates: connections.map(c => ({
        id: c.sessionId.slice(0, 8),
        server: c.serverName,
        state: c.state,
        tools: c.tools.length,
      })),
    });
  }, [connections, isInitializing, isConnecting]);

  return {
    connections,
    connect,
    disconnect,
    getConnection,
    getConnectionByServerId,
    isServerConnected,
    getTools,
    isInitializing,
    isConnecting,
    refresh,
  };
}
