import { useState, useCallback, useSyncExternalStore } from 'react';
import { toast } from "react-hot-toast";
import { connectionStore } from '@/lib/mcp/connection-store';
import { McpServer, ParsedRegistryServer, ToolInfo } from '@/types/mcp';

interface UseMcpConnectionProps {
  servers?: McpServer[] | null;
  setServers?: (servers: McpServer[] | null | ((prev: McpServer[] | null) => McpServer[] | null)) => void;
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

export function useMcpConnection({ servers, setServers }: UseMcpConnectionProps = {}) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const storeSnapshot = useSyncExternalStore(
    (callback) => connectionStore.subscribe(callback),
    () => JSON.stringify(connectionStore.getAll()),
    () => JSON.stringify({})
  );

  const getConnection = useCallback((serverId: string) => {
    const connections = JSON.parse(storeSnapshot);
    return connections[serverId] || null;
  }, [storeSnapshot]);

  const mergeWithStoredState = useCallback((serverList: ParsedRegistryServer[]): ParsedRegistryServer[] => {
    const storedConnections = JSON.parse(storeSnapshot);

    return serverList.map((server) => {
      const stored = storedConnections[server.id];
      if (stored?.connectionStatus === 'CONNECTED') {
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
  }, [setServers]);

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

  return {
    isConnecting,
    connectionError,
    getConnection,
    mergeWithStoredState,
    connect,
    disconnect,
  };
}
