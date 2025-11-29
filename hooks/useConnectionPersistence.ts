import { useEffect, useCallback } from 'react';
import { connectionStore } from '@/lib/mcp/connection-store';
import { McpServer } from '@/types/mcp';

interface UseConnectionPersistenceProps {
  servers: McpServer[] | null;
  setServers: (servers: McpServer[] | null | ((prev: McpServer[] | null) => McpServer[] | null)) => void;
}

/**
 * Hook to manage MCP connection state persistence using localStorage
 *
 * This hook handles:
 * 1. Restoring connection state from localStorage on mount
 * 2. Merging stored connection data with fetched server data
 */
export function useConnectionPersistence({ servers, setServers }: UseConnectionPersistenceProps) {
  /**
   * Merge stored connection state with server data
   */
  const mergeWithStoredState = useCallback((serverList: McpServer[]): McpServer[] => {
    const storedConnections = connectionStore.getAll();

    return serverList.map((server) => {
      const stored = storedConnections[server.name];
      if (stored && stored.connectionStatus === 'CONNECTED') {
        return {
          ...server,
          connectionStatus: stored.connectionStatus,
          tools: stored.tools,
        };
      }
      return server;
    });
  }, []);

  /**
   * Save connection state to localStorage
   */
  const saveConnection = useCallback((serverName: string, sessionId: string, tools: any[]) => {
    connectionStore.set(serverName, {
      sessionId,
      connectionStatus: 'CONNECTED',
      tools,
    });
  }, []);

  /**
   * Remove connection state from localStorage
   */
  const removeConnection = useCallback((serverName: string) => {
    connectionStore.remove(serverName);
  }, []);

  /**
   * Update server state with connection info
   */
  const updateServerConnection = useCallback((
    serverName: string,
    connectionStatus: string,
    tools: any[]
  ) => {
    setServers(prev => {
      if (!prev) return prev;
      return prev.map(server => {
        if (server.name === serverName) {
          return {
            ...server,
            connectionStatus,
            tools,
            updated_at: new Date().toISOString()
          };
        }
        return server;
      });
    });
  }, [setServers]);

  return {
    mergeWithStoredState,
    saveConnection,
    removeConnection,
    updateServerConnection,
  };
}
