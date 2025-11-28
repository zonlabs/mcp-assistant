"use client";

import { useState, useEffect } from 'react';
import { connectionStore, StoredConnection } from '@/lib/mcp/connection-store';
import { ToolInfo } from '@/types/mcp';

export interface McpServerWithTools {
  serverName: string;
  sessionId: string;
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  // Server config fields for backend
  transport?: string;
  url?: string;
  headers?: Record<string, string> | null;
}

export interface UseMcpToolsReturn {
  mcpServers: McpServerWithTools[];
  loading: boolean;
  loadMcpServers: () => void;
}

/**
 * Hook to get all active MCP servers and their tools from connection store
 * OAuth headers are fetched from server-side session and kept in memory only (not localStorage)
 */
export function useMcpTools(): UseMcpToolsReturn {
  const [mcpServers, setMcpServers] = useState<McpServerWithTools[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMcpServers = async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      // Validate all stored connections and get tools/headers data in one call
      // This returns Map<serverName, {tools, headers}>
      const validServersData = await connectionStore.getValidConnections();

      if (validServersData.size === 0) {
        setMcpServers([]);
        setLoading(false);
        return;
      }

      // Get all connections (after cleanup from validation)
      const connections = connectionStore.getAll();

      // Build servers with data from validation (no additional API calls needed)
      const serversWithData = Array.from(validServersData.entries()).map(([serverName, data]) => {
        const connection = connections[serverName];
        if (!connection || connection.connectionStatus !== 'CONNECTED') {
          return null;
        }

        return {
          serverName,
          sessionId: connection.sessionId,
          connectionStatus: connection.connectionStatus,
          tools: data.tools, // Tools from validation call
          connectedAt: connection.connectedAt,
          transport: connection.transport,
          url: connection.url,
          headers: data.headers, // Headers from validation call
        } as McpServerWithTools;
      }).filter((server): server is McpServerWithTools => server !== null);

      setMcpServers(serversWithData);
    } catch (error) {
      console.error('[useMcpTools] Failed to load MCP servers:', error);
      setMcpServers([]);
    } finally {
      setLoading(false);
    }
  };

  // Don't load automatically on mount - let the dropdown trigger it
  // useEffect(() => {
  //   loadMcpServers();
  // }, []);

  return {
    mcpServers,
    loading,
    loadMcpServers, // Expose this for manual triggering
  };
}
