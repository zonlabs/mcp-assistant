"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import McpClientLayout from "@/components/mcp-client/McpClientLayout";
import OAuthCallbackHandler from "@/components/mcp-client/OAuthCallbackHandler";
import { McpServer, ToolInfo } from "@/types/mcp";
import { connectionStore } from "@/lib/mcp/connection-store";
import { useMcpServersPagination } from "@/hooks/useMcpServersPagination";
import { ConnectionProvider } from "@/components/providers/ConnectionProvider";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useMcpConnection } from "@/hooks/useMcpConnection";

function McpPageContent() {
  const { data: session } = useSession();
  const [userServers, setUserServers] = useState<McpServer[] | null>(null);
  const [userServersCount, setUserServersCount] = useState(0);
  const [userError, setUserError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // Use connection persistence hook for connect/disconnect operations
  const { connect, disconnect } = useMcpConnection();

  // Use GraphQL pagination hook for public servers
  const {
    servers: publicServers,
    loading: publicLoading,
    error: publicError,
    hasNextPage,
    isLoadingMore,
    totalCount: publicServersCount,
    loadMore: loadMorePublicServers,
    refetch: refetchPublicServers,
  } = useMcpServersPagination(10);

  const fetchUserServers = useCallback(async () => {
    if (!session) return;

    setUserLoading(true);
    setUserError(null);

    try {
      const res = await fetch(`/api/mcp/user`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.errors?.[0]?.message || res.statusText);
      const userServersList = json?.data?.getUserMcpServers ?? [];

      // Merge with stored connection state from localStorage
      const storedConnections = connectionStore.getAll();
      const mergedServers = userServersList.map((server: McpServer) => {
        const stored = storedConnections[server.id];
        if (stored && stored.connectionStatus === 'CONNECTED') {
          return {
            ...server,
            connectionStatus: stored.connectionStatus,
            tools: stored.tools,
          };
        }
        // If not in localStorage, it's disconnected
        return {
          ...server,
          connectionStatus: server.connectionStatus || 'DISCONNECTED',
          tools: server.tools || [],
        };
      });

      setUserServers(mergedServers);
      setUserServersCount(mergedServers.length);
      // toast.success("Your servers loaded successfully");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load your servers";
      setUserError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUserLoading(false);
    }
  }, [session]);

  const handleServerAction = async (server: McpServer, action: 'activate' | 'deactivate') => {
    try {
      if (action === 'activate') {
        // Use the shared connection hook - store will trigger reactive updates
        await connect(server);
        return { success: true };
      }

      if (action === 'deactivate') {
        // Use the shared disconnection hook - store will trigger reactive updates
        await disconnect(server);
        return { success: true };
      }
    } catch (error) {
      throw error;
    }
  };

  const handleServerAdd = async (data: Record<string, unknown>) => {
    const response = await fetch('/api/mcp/servers', {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to add server');
    }

    // Refresh servers list
    await refetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  };

  const handleServerUpdate = async (data: Record<string, unknown>) => {
    const response = await fetch('/api/mcp/servers', {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to update server');
    }

    // Refresh servers list
    await refetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  };

  const handleServerDelete = async (serverName: string) => {
    const response = await fetch(`/api/mcp/servers?name=${encodeURIComponent(serverName)}`, {
      method: "DELETE",
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to delete server');
    }

    // Refresh servers list
    await refetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  };

  const handleUpdatePublicServer = (serverId: string, updates: Partial<McpServer>) => {
    // Public servers are managed by the hook, refetch to get latest
    refetchPublicServers();
  };

  const handleUpdateUserServer = (serverId: string, updates: Partial<McpServer>) => {
    setUserServers(prevServers => {
      if (!prevServers) return prevServers;
      return prevServers.map(server =>
        server.id === serverId
          ? { ...server, ...updates }
          : server
      );
    });
  };

  // Handle OAuth callback redirect using shared hook
  // Store will trigger reactive updates automatically, no refetch needed
  useOAuthCallback();


  // Public servers are auto-loaded by the hook
  useEffect(() => {
    if (session) {
      fetchUserServers();
    }
  }, [session, fetchUserServers]);

  const refreshAllServers = useCallback(async () => {
    await refetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  }, [session, fetchUserServers, refetchPublicServers]);

  return (
    <>
      <OAuthCallbackHandler onRefreshServers={refreshAllServers} />
      <McpClientLayout
        publicServers={publicServers}
        userServers={userServers}
        publicServersCount={publicServersCount}
        userServersCount={userServersCount}
        publicLoading={publicLoading}
        userLoading={userLoading}
        publicError={publicError}
        userError={userError}
        session={session}
        onRefreshPublic={refetchPublicServers}
        onRefreshUser={fetchUserServers}
        onServerAction={handleServerAction}
        onServerAdd={handleServerAdd}
        onServerUpdate={handleServerUpdate}
        onServerDelete={handleServerDelete}
        onUpdatePublicServer={handleUpdatePublicServer}
        onUpdateUserServer={handleUpdateUserServer}
        hasNextPage={hasNextPage}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMorePublicServers}
      />
    </>
  );
}

// Stable filter function to prevent unnecessary re-renders
const mcpServerFilter = (serverId: string) => serverId.startsWith('mcp_');

export default function McpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {/* Only validate user MCP server connections (starting with mcp_) */}
      <ConnectionProvider validateFilter={mcpServerFilter}>
        <McpPageContent />
      </ConnectionProvider>
    </Suspense>
  );
}
