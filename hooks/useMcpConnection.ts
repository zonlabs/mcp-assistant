import { useState, useCallback, useMemo } from 'react';
import { toast } from "react-hot-toast";
import { McpServer, ToolInfo } from '@/types/mcp';
import { useMcpStore, type McpStore, type StoredConnection } from '@/lib/stores/mcp-store';

// Re-export StoredConnection for backward compatibility
export type { StoredConnection };

interface UseMcpConnectionProps {
  servers?: McpServer[] | null;
  setServers?: (servers: McpServer[] | null | ((prev: McpServer[] | null) => McpServer[] | null)) => void;
  serverId?: string;
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

  // Get shared connections from Zustand store
  const connections = useMcpStore((state: McpStore) => state.connections);
  const isLoading = useMcpStore((state: McpStore) => state.isValidating);
  const validateAllSessions = useMcpStore((state: McpStore) => state.validateAllSessions);

  // Get connection by sessionId
  const getConnection = useCallback((id: string) => {
    return connections[id] || null;
  }, [connections]);

  // Get connection status
  const getConnectionStatus = useCallback((id: string): 'CONNECTED' | 'DISCONNECTED' => {
    return connections[id]?.connectionStatus === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED';
  }, [connections]);

  // Check if connected
  const isServerConnected = useCallback((id: string): boolean => {
    return connections[id]?.connectionStatus === 'CONNECTED';
  }, [connections]);

  // Get tools
  const getServerTools = useCallback((id: string): ToolInfo[] => {
    return connections[id]?.tools || [];
  }, [connections]);

  // Active connections
  const activeConnections = useMemo(() => {
    return Object.entries(connections)
      .filter(([_, conn]) => conn.connectionStatus === 'CONNECTED')
      .reduce((acc, [id, conn]) => {
        acc[id] = conn;
        return acc;
      }, {} as Record<string, StoredConnection>);
  }, [connections]);

  const activeConnectionCount = useMemo(() => {
    return Object.keys(activeConnections).length;
  }, [activeConnections]);

  // Single server data
  const connection = serverId ? getConnection(serverId) : null;
  const isConnected = serverId ? isServerConnected(serverId) : false;
  const tools = serverId ? getServerTools(serverId) : [];

  // Merge with server list
  const mergeWithStoredState = useCallback(<T extends { id: string, connectionStatus?: string | null | undefined, tools?: ToolInfo[] }>(serverList: T[]): T[] => {
    return serverList.map((server) => {
      // Find connection by serverId (not sessionId)
      const stored = Object.values(connections).find((c) => c.serverId === server.id);
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

      const response = await fetch("/api/mcp/connect", {
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
        toast.success("Connected successfully!");
        await validateAllSessions(); // Refresh after connect
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
  }, [validateAllSessions]);

  const disconnect = useCallback(async (server: ConnectableServer) => {
    const connection = getConnection(server.id);
    if (!connection?.sessionId) {
      toast.error("Connection information not found");
      return;
    }

    try {
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: connection.sessionId }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Disconnected successfully");
        await validateAllSessions(); // Refresh after disconnect
      } else {
        throw new Error(result.error || "Failed to disconnect");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    }
  }, [getConnection, validateAllSessions]);

  // Backward compatibility for validateConnections
  const validateConnections = useCallback(
    async (
      filterFn?: (serverId: string) => boolean,
      onProgress?: (validated: number, total: number) => void
    ) => {
      await validateAllSessions();
      if (onProgress) {
        const total = Object.keys(connections).length;
        onProgress(total, total);
      }
    },
    [validateAllSessions, connections]
  );

  return {
    // State
    isConnecting,
    connectionError,
    isLoading,

    // Single server data
    connection,
    isConnected,
    tools,

    // Helpers
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
    validateConnections,

    // Utilities
    mergeWithStoredState,
  };
}
