import { useState, useCallback, useSyncExternalStore } from 'react';
import { toast } from "react-hot-toast";
import { connectionStore } from '@/lib/mcp/connection-store';
import { McpServer, ParsedRegistryServer, ToolInfo } from '@/types/mcp';

interface UseConnectionPersistenceProps {
  servers?: McpServer[] | null;
  setServers?: (servers: McpServer[] | null | ((prev: McpServer[] | null) => McpServer[] | null)) => void;
}

/**
 * Flexible server type that works with both McpServer and ParsedRegistryServer
 */
type ConnectableServer = {
  id: string;
  name: string;
  url?: string | null;
  remoteUrl?: string | null;
  transport?: string;
  transportType?: string | null;
  title?: string | null;
};

/**
 * Hook to manage MCP connection state persistence using localStorage
 *
 * This hook handles:
 * 1. Reactive connection state from ConnectionStore
 * 2. Connect/Disconnect actions with API integration
 * 3. Merging stored connection data with fetched server lists
 */
export function useConnectionPersistence({ servers, setServers }: UseConnectionPersistenceProps = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Subscribe to store updates for reactivity
  const storeSnapshot = useSyncExternalStore(
    (callback) => connectionStore.subscribe(callback),
    () => JSON.stringify(connectionStore.getAll()),
    () => JSON.stringify({})
  );

  /**
   * Get connection info for a specific server by ID
   */
  const getConnection = useCallback((serverId: string) => {
    const connections = JSON.parse(storeSnapshot);
    return connections[serverId] || null;
  }, [storeSnapshot]);

  /**
   * Merge stored connection state with a list of servers
   */
  const mergeWithStoredState = useCallback((serverList: ParsedRegistryServer[]): ParsedRegistryServer[] => {
    const storedConnections = JSON.parse(storeSnapshot);

    return serverList.map((server) => {
      const stored = storedConnections[server.id];
      // Only override if we have a valid connection record
      if (stored && stored.connectionStatus === 'CONNECTED') {
        return {
          ...server,
          connectionStatus: stored.connectionStatus,
          tools: stored.tools,
        };
      }
      return {
        ...server,
        connectionStatus: server.connectionStatus || 'DISCONNECTED',
      };
    });
  }, [storeSnapshot]);

  /**
   * Connect to an MCP server
   * Works with both McpServer and ParsedRegistryServer types
   */
  const connect = useCallback(async (server: ConnectableServer) => {
    // Extract URL (supports both McpServer.url and ParsedRegistryServer.remoteUrl)
    const serverUrl = server.remoteUrl || server.url;
    if (!serverUrl) {
      toast.error("No URL available for this server");
      return;
    }

    // Extract transport type (supports both McpServer.transport and ParsedRegistryServer.transportType)
    const transport = server.transportType || server.transport;
    if (!transport) {
      toast.error("Transport type not available for this server");
      return;
    }

    // Validate transport type for HTTP connection
    if (transport === 'stdio' || transport === 'websocket') {
      toast.error(`Transport type '${transport}' must use Django GraphQL connection. HTTP connection only supports SSE/HTTP streaming endpoints.`);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Normalize URL based on transport type
      let normalizedUrl = serverUrl;
      if (transport === 'sse') {
        // SSE transport requires /sse endpoint
        if (!normalizedUrl.endsWith('/sse')) {
          normalizedUrl = normalizedUrl + '/sse';
        }
      } else if (transport === 'streamable_http') {
        // StreamableHTTP uses base URL - remove /sse or /message suffix
        if (normalizedUrl.endsWith('/sse')) {
          normalizedUrl = normalizedUrl.slice(0, -4);
        } else if (normalizedUrl.endsWith('/message')) {
          normalizedUrl = normalizedUrl.slice(0, -8);
        }
      }

      // Store the current page path to return to after OAuth
      const sourceUrl = window.location.pathname;

      const response = await fetch("/api/mcp/auth/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serverUrl: normalizedUrl,
          callbackUrl: `${window.location.origin}/api/mcp/auth/callback`,
          serverId: server.id,
          serverName: server.title || server.name,
          transportType: transport,
          sourceUrl, // Pass the current page path
        }),
      });

      const result = await response.json();

      if (result.requiresAuth && result.authUrl) {
        toast.success("Redirecting to OAuth authorization...");
        window.location.href = result.authUrl;
        return;
      }

      if (result.success && result.sessionId) {
        let fetchedTools: ToolInfo[] = [];
        const toolsResponse = await fetch(`/api/mcp/tool/list?sessionId=${result.sessionId}`);
        if (toolsResponse.ok) {
          const toolsData = await toolsResponse.json();
          fetchedTools = toolsData.tools || [];
        }

        toast.success("Connected successfully!");

        // Persist connection using server ID
        connectionStore.set(server.id, {
          sessionId: result.sessionId,
          serverName: server.name,
          connectionStatus: 'CONNECTED',
          tools: fetchedTools,
          transport: transport,
          url: serverUrl,
        });

        // Optionally update local state if setServers is provided
        if (setServers) {
           // This part is less critical now that we have reactive merging,
           // but kept for compatibility with useMcpServers legacy usage if needed.
        }

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
  }, [setServers]);

  /**
   * Disconnect from an MCP server
   * Works with both McpServer and ParsedRegistryServer types
   */
  const disconnect = useCallback(async (server: ConnectableServer) => {
    const connection = getConnection(server.id);
    if (!connection?.sessionId) {
      toast.error("Connection information not found. Server may already be disconnected.");
      return;
    }

    try {
      const response = await fetch("/api/mcp/auth/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: connection.sessionId,
        }),
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

  return {
    isConnecting,
    connectionError,
    getConnection,
    mergeWithStoredState,
    connect,
    disconnect,
  };
}
