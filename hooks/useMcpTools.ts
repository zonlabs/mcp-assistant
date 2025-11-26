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
  refresh: () => void;
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
      // First, validate all stored connections and clean up expired ones
      const validServerNames = await connectionStore.getValidConnections();

      if (validServerNames.length === 0) {
        setMcpServers([]);
        setLoading(false);
        return;
      }

      // Get all connections again (after cleanup)
      const connections = connectionStore.getAll();

      // Filter connected servers that are also valid
      const connectedServers = Object.entries(connections)
        .filter(([serverName, connection]) =>
          connection.connectionStatus === 'CONNECTED' &&
          validServerNames.includes(serverName)
        );

      if (connectedServers.length === 0) {
        setMcpServers([]);
        setLoading(false);
        return;
      }

      // Fetch tools and OAuth headers for each server in a single API call
      const serversWithData = await Promise.all(
        connectedServers.map(async ([serverName, connection]) => {
          let tools = connection.tools || [];
          let headers = null;

          // Fetch tools and headers from /api/mcp/tool/list (single call)
          try {
            const response = await fetch(`/api/mcp/tool/list?sessionId=${connection.sessionId}`);
            if (response.ok) {
              const data = await response.json();
              // Update tools and headers from API response
              tools = data.tools || tools;
              headers = data.headers || null;
            }
          } catch (error) {
            console.error(`[useMcpTools] Failed to fetch tools/headers for ${serverName}:`, error);
          }

          return {
            serverName,
            sessionId: connection.sessionId,
            connectionStatus: connection.connectionStatus,
            tools,
            connectedAt: connection.connectedAt,
            transport: connection.transport, // Get from localStorage
            url: connection.url, // Get from localStorage
            headers, // Headers fetched from server, kept in memory only
          };
        })
      );

      setMcpServers(serversWithData);
    } catch (error) {
      console.error('[useMcpTools] Failed to load MCP servers:', error);
      setMcpServers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMcpServers();
  }, []); // Run once on mount only

  return {
    mcpServers,
    loading,
    refresh: loadMcpServers,
  };
}
