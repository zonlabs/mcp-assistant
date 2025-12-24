import { useState, useCallback, useSyncExternalStore, useMemo } from 'react';
import { toast } from "react-hot-toast";
import { connectionStore, StoredConnection } from '@/lib/mcp/connection-store';
import { McpServer, ParsedRegistryServer, ToolInfo } from '@/types/mcp';

interface UseMcpConnectionProps {
  servers?: McpServer[] | null;
  setServers?: (servers: McpServer[] | null | ((prev: McpServer[] | null) => McpServer[] | null)) => void;
  serverId?: string; // Optional: subscribe to a specific server only
}

type ConnectableServer = {
  id: string;
  name: string;
  url?: string | null;
  remoteUrl?: string | null;
  transport?: string;
  transportType?: string | null;
  title?: string | null;
};

const UNSUPPORTED_TRANSPORTS = ['stdio', 'websocket'];

function extractServerUrl(server: ConnectableServer): string | null {
  return server.remoteUrl || server.url || null;
}

function extractTransport(server: ConnectableServer): string | null {
  return server.transportType || server.transport || null;
}

export function useMcpConnection({ servers, setServers, serverId }: UseMcpConnectionProps = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Subscribe to the connection store
  const storeSnapshot = useSyncExternalStore(
    (callback) => connectionStore.subscribe(callback),
    () => JSON.stringify(connectionStore.getAll()),
    () => JSON.stringify({})
  );

  // Parse connections once
  const connections = useMemo<Record<string, StoredConnection>>(() => {
    try {
      return JSON.parse(storeSnapshot);
    } catch {
      return {};
    }
  }, [storeSnapshot]);

  // Get connection for a specific server
  const getConnection = useCallback((id: string) => {
    return connections[id] || null;
  }, [connections]);

  // Get connection status for a specific server
  const getConnectionStatus = useCallback((id: string): 'CONNECTED' | 'DISCONNECTED' => {
    return connections[id]?.connectionStatus === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';
  }, [connections]);

  // Check if a server is connected
  const isServerConnected = useCallback((id: string): boolean => {
    return connections[id]?.connectionStatus === 'CONNECTED';
  }, [connections]);

  // Get tools for a specific server
  const getServerTools = useCallback((id: string): ToolInfo[] => {
    return connections[id]?.tools || [];
  }, [connections]);

  // Get all active connections
  const activeConnections = useMemo(() => {
    return Object.entries(connections)
      .filter(([_, conn]) => conn.connectionStatus === 'CONNECTED')
      .reduce((acc, [id, conn]) => {
        acc[id] = conn;
        return acc;
      }, {} as Record<string, StoredConnection>);
  }, [connections]);

  // Get count of active connections
  const activeConnectionCount = useMemo(() => {
    return Object.keys(activeConnections).length;
  }, [activeConnections]);

  // If serverId is provided, return connection data for that specific server
  const connection = serverId ? getConnection(serverId) : null;
  const isConnected = serverId ? isServerConnected(serverId) : false;
  const tools = serverId ? getServerTools(serverId) : [];

  // Merge server list with stored connection state
  const mergeWithStoredState = useCallback(<T extends { id: string, connectionStatus?: string | null | undefined, tools?: ToolInfo[] }>(serverList: T[]): T[] => {
    return serverList.map((server) => {
      const stored = connections[server.id];
      if (stored) {
        return {
          ...server,
          connectionStatus: stored.connectionStatus,
          tools: stored.tools || [],
        };
      }
      return {
        ...server,
        connectionStatus: server.connectionStatus || 'DISCONNECTED',
      };
    });
  }, [connections]);

  const connect = useCallback(async (server: ConnectableServer) => {
    const serverUrl = extractServerUrl(server);
    if (!serverUrl) {
      toast.error("No URL available for this server");
      return;
    }

    const transport = extractTransport(server);
    if (!transport) {
      toast.error("Transport type not available for this server");
      return;
    }

    if (UNSUPPORTED_TRANSPORTS.includes(transport)) {
      toast.error(`Transport type '${transport}' is not supported`);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const sourceUrl = window.location.pathname;

      const response = await fetch("/api/mcp/auth/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverUrl: serverUrl,
          callbackUrl: `${window.location.origin}/api/mcp/auth/callback`,
          serverId: server.id,
          serverName: server.title || server.name,
          transportType: transport,
          sourceUrl,
        }),
      });

      const result = await response.json();

      if (result.requiresAuth && result.authUrl) {
        toast.success("Redirecting to authorization server...");
        window.location.href = result.authUrl;
        return;
      }

      if (result.success && result.sessionId) {
        // Validate connection before setting it as CONNECTED
        let fetchedTools: ToolInfo[] = [];
        try {
          const toolsResponse = await fetch(`/api/mcp/tool/list?sessionId=${result.sessionId}`);
          if (!toolsResponse.ok) {
            throw new Error("Failed to fetch tools - connection may be invalid");
          }
          const toolsData = await toolsResponse.json();
          fetchedTools = toolsData.tools || [];
        } catch (toolError) {
          // If validation fails, don't set connection as CONNECTED
          throw new Error(toolError instanceof Error ? toolError.message : "Failed to validate connection");
        }

        toast.success("Connected successfully!");

        // Only set connection after successful validation
        connectionStore.set(server.id, {
          sessionId: result.sessionId,
          serverName: server.name,
          connectionStatus: 'CONNECTED',
          tools: fetchedTools,
          transport: transport,
          url: serverUrl,
        });
      } else {
        throw new Error(result.error || "Failed to connect");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to connect";
      setConnectionError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async (server: ConnectableServer) => {
    const connection = getConnection(server.id);
    if (!connection?.sessionId) {
      toast.error("Connection information not found");
      return;
    }

    try {
      const response = await fetch("/api/mcp/auth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: connection.sessionId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Disconnected successfully");
        connectionStore.remove(server.id);
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    }
  }, [getConnection]);

  // Validate a specific connection
  const validateSingleConnection = useCallback(async (id: string) => {
    return await connectionStore.validateConnection(id);
  }, []);

  // Validate connections - updates state after each connection is validated
  const validateConnections = useCallback(
    async (
      filterFn?: (serverId: string) => boolean,
      onProgress?: (validated: number, total: number) => void
    ) => {
      return await connectionStore.validateConnections(filterFn, onProgress);
    },
    []
  );

  return {
    // Connection state
    isConnecting,
    connectionError,

    // Single server data (when serverId is provided)
    connection,
    isConnected,
    tools,

    // Helper functions
    getConnection,
    getConnectionStatus,
    isServerConnected,
    getServerTools,

    // Active connections
    activeConnections,
    activeConnectionCount,

    // All connections
    connections,

    // Actions
    connect,
    disconnect,

    // Validation
    validateSingleConnection,
    validateConnections,

    // Utilities
    mergeWithStoredState,
  };
}
