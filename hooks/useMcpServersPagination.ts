"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { McpServer } from "@/types/mcp";
import { connectionStore } from "@/lib/mcp/connection-store";
import { MCP_SERVERS_QUERY } from "@/lib/graphql";

const GET_MCP_SERVERS = gql`${MCP_SERVERS_QUERY}`;

/**
 * Custom hook for MCP servers pagination using GraphQL directly
 * Handles cursor-based pagination and connection state merging
 */
export function useMcpServersPagination(first: number = 10) {
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, loading, error, fetchMore, refetch } = useQuery<{
    mcpServers: {
      edges: Array<{ node: McpServer; cursor: string }>;
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
      totalCount: number;
    };
  }>(GET_MCP_SERVERS, {
    variables: {
      first,
    },
    fetchPolicy: "cache-and-network",
  });

  // Merge with localStorage connection state
  const mergeWithConnectionState = useCallback((servers: McpServer[]) => {
    const storedConnections = connectionStore.getAll();
    return servers.map((server) => {
      const stored = storedConnections[server.name];
      if (stored && stored.connectionStatus === "CONNECTED") {
        return {
          ...server,
          connectionStatus: stored.connectionStatus,
          tools: stored.tools,
        };
      }
      return {
        ...server,
        connectionStatus: server.connectionStatus || "DISCONNECTED",
        tools: server.tools || [],
      };
    });
  }, []);

  const servers = data?.mcpServers?.edges?.map((edge) => edge.node) || [];
  const mergedServers = mergeWithConnectionState(servers);
  const pageInfo = data?.mcpServers?.pageInfo;
  const totalCount = data?.mcpServers?.totalCount || 0;

  // Load more servers using cursor-based pagination
  const loadMore = useCallback(async () => {
    if (!pageInfo?.endCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      await fetchMore({
        variables: {
          after: pageInfo.endCursor,
        },
      });
    } catch (err) {
      console.error("Failed to load more servers:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchMore, pageInfo?.endCursor, isLoadingMore]);

  return {
    servers: mergedServers,
    loading,
    error: error?.message || null,
    hasNextPage: pageInfo?.hasNextPage || false,
    isLoadingMore,
    totalCount,
    loadMore,
    refetch,
  };
}
