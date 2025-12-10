"use client";

import { useState, useSyncExternalStore } from 'react';
import { connectionStore, StoredConnection } from '@/lib/mcp/connection-store';
import { ToolInfo } from '@/types/mcp';

export interface McpServerWithTools {
  serverName: string;
  sessionId: string;
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  // Server config fields for backend (NO headers - fetched server-side)
  transport?: string;
  url?: string;
}

export interface UseMcpToolsReturn {
  mcpServers: McpServerWithTools[];
  loading: boolean;
  loadMcpServers: () => void;
}

/**
 * Hook to get all active MCP servers and their tools from connection store
 * NOTE: OAuth headers are NOT fetched client-side for security
 * Headers are retrieved server-side in the CopilotKit route
 */
export function useMcpTools(): UseMcpToolsReturn {
  const [isValidating, setIsValidating] = useState(false);

  // Subscribe to store updates using useSyncExternalStore
  const storeSnapshot = useSyncExternalStore(
    (callback) => connectionStore.subscribe(callback),
    () => JSON.stringify(connectionStore.getAll()),
    () => JSON.stringify({}) // Server-side fallback
  );


  
  const currentServers = (() => {
    try {
      const connections = JSON.parse(storeSnapshot) as Record<string, StoredConnection>;
      return Object.values(connections)
        .filter(connection => connection.connectionStatus === 'CONNECTED')
        .map(connection => ({
          serverName: connection.serverName,
          sessionId: connection.sessionId,
          connectionStatus: connection.connectionStatus,
          tools: connection.tools,
          connectedAt: connection.connectedAt,
          transport: connection.transport,
          url: connection.url,
        } as McpServerWithTools));
    } catch {
      return [] as McpServerWithTools[];
    }
  })();

  const loadMcpServers = async () => {
    if (typeof window === 'undefined') return;

    // Trigger validation but don't wait for it to finish.
    // The UI will update automatically via store subscription.
    setIsValidating(true);
    try {
      await connectionStore.validateConnections();
    } catch (error) {
      console.error('[useMcpTools] Failed to validate MCP servers:', error);
    } finally {
      setIsValidating(false);
    }
  };

  return {
    mcpServers: currentServers,
    loading: isValidating && currentServers.length === 0,
    loadMcpServers,
  };
}
