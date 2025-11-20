"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import McpClientLayout from "@/components/mcp-client/McpClientLayout";
import OAuthCallbackHandler from "@/components/mcp-client/OAuthCallbackHandler";
import { McpServer } from "@/types/mcp";

function McpPageContent() {
  const { data: session } = useSession();
  const [publicServers, setPublicServers] = useState<McpServer[] | null>(null);
  const [userServers, setUserServers] = useState<McpServer[] | null>(null);
  const [publicServersCount, setPublicServersCount] = useState(0);
  const [userServersCount, setUserServersCount] = useState(0);
  const [publicError, setPublicError] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [publicLoading, setPublicLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  // Pagination state
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchPublicServers = async (reset = true) => {
    if (reset) {
      setPublicLoading(true);
      setPublicServers(null);
      setEndCursor(null);
    }
    setPublicError(null);

    try {
      const res = await fetch(`/api/mcp?first=10`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.errors?.[0]?.message || res.statusText);

      // Extract nodes and pagination info from edges structure
      const edges = json?.data?.mcpServers?.edges || [];
      const servers = edges.map((edge: { node: unknown }) => edge.node);
      const pageInfo = json?.data?.mcpServers?.pageInfo;
      const totalCount = json?.data?.mcpServers?.totalCount || 0;

      setPublicServers(servers);
      setPublicServersCount(totalCount);
      setHasNextPage(pageInfo?.hasNextPage ?? false);
      setEndCursor(pageInfo?.endCursor ?? null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load public servers";
      setPublicError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPublicLoading(false);
    }
  };

  const loadMorePublicServers = async () => {
    if (!hasNextPage || isLoadingMore || !endCursor) return;

    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/mcp?first=10&after=${encodeURIComponent(endCursor)}`, {
        method: "GET"
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.errors?.[0]?.message || res.statusText);

      // Extract nodes and pagination info
      const edges = json?.data?.mcpServers?.edges || [];
      const newServers = edges.map((edge: { node: unknown }) => edge.node);
      const pageInfo = json?.data?.mcpServers?.pageInfo;

      // Append new servers to existing list
      setPublicServers(prev => prev ? [...prev, ...newServers] : newServers);
      setHasNextPage(pageInfo?.hasNextPage ?? false);
      setEndCursor(pageInfo?.endCursor ?? null);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load more servers";
      toast.error(errorMessage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const fetchUserServers = useCallback(async () => {
    if (!session) return;
    
    setUserLoading(true);
    setUserError(null);
    
    try {
      const res = await fetch(`/api/mcp/user`, { method: "GET" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.errors?.[0]?.message || res.statusText);
      const userServersList = json?.data?.getUserMcpServers ?? [];
      setUserServers(userServersList);
      setUserServersCount(userServersList.length);
      // toast.success("Your servers loaded successfully");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Failed to load your servers";
      setUserError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUserLoading(false);
    }
  }, [session]);

  const handleServerAction = async (serverName: string, action: 'restart' | 'activate' | 'deactivate') => {
    try {
      const response = await fetch('/api/mcp/actions', {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action,
          serverName
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Action failed');
      }

      // Check if OAuth authorization is required (NEW UNIFIED FLOW)
      // This applies to both 'activate' and 'restart' actions
      if (action === 'activate' || action === 'restart') {
        const actionResult = result.data?.connectMcpServer || result.data?.restartMcpServer;

        if (actionResult?.requiresAuth && actionResult?.authorizationUrl) {
          // toast.success(`Redirecting to OAuth authorization for ${serverName}...`);
          // Redirect to OAuth authorization URL
          window.location.href = actionResult.authorizationUrl;
          return actionResult; // Exit early, page will redirect
        }
      }

      // Get the response data for the specific action
      const actionResponse = result.data?.connectMcpServer ||
                            result.data?.disconnectMcpServer ||
                            result.data?.restartMcpServer;
      
      // Extract the server data from the response
      const updatedServer = actionResponse?.server;

      // Check if the operation was actually successful
      if (actionResponse && actionResponse.success === false) {
        // For failed operations, we still want to update the UI with the failed status
        // Don't throw an error, just mark it as failed
      }

      // Update local state for both public and user servers
      setPublicServers(prevServers => {
        if (!prevServers) return prevServers;
        return prevServers.map(server => {
          if (server.name === serverName) {
            // Handle connection status from backend or set default based on action
            let newConnectionStatus = updatedServer?.connectionStatus;
            
            // If the operation failed, set status to FAILED
            if (actionResponse && actionResponse.success === false) {
              newConnectionStatus = 'FAILED';
            } else if (!newConnectionStatus) {
              // Set default status based on action
              newConnectionStatus = action === 'activate' ? 'CONNECTED' : 'DISCONNECTED';
            } else {
              // Ensure connection status is uppercase to match UI expectations
              newConnectionStatus = newConnectionStatus.toUpperCase();
            }
            
            return {
              ...server,
              connectionStatus: newConnectionStatus,
              tools: (action === 'deactivate' || newConnectionStatus === 'FAILED') ? [] : (updatedServer?.tools || server.tools),
              updated_at: new Date().toISOString()
            };
          }
          return server;
        });
      });

      setUserServers(prevServers => {
        if (!prevServers) return prevServers;
        return prevServers.map(server => {
          if (server.name === serverName) {
            // Handle connection status from backend or set default based on action
            let newConnectionStatus = updatedServer?.connectionStatus;
            
            // If the operation failed, set status to FAILED
            if (actionResponse && actionResponse.success === false) {
              newConnectionStatus = 'FAILED';
            } else if (!newConnectionStatus) {
              // Set default status based on action
              newConnectionStatus = action === 'activate' ? 'CONNECTED' : 'DISCONNECTED';
            } else {
              // Ensure connection status is uppercase to match UI expectations
              newConnectionStatus = newConnectionStatus.toUpperCase();
            }
            
            return {
              ...server,
              connectionStatus: newConnectionStatus,
              tools: (action === 'deactivate' || newConnectionStatus === 'FAILED') ? [] : (updatedServer?.tools || server.tools),
              updated_at: new Date().toISOString()
            };
          }
          return server;
        });
      });

      // Return the response data so the UI can show the appropriate message
      return actionResponse;
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
    await fetchPublicServers();
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
    await fetchPublicServers();
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
    await fetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  };

  const handleUpdatePublicServer = (serverId: string, updates: Partial<McpServer>) => {
    setPublicServers(prevServers => {
      if (!prevServers) return prevServers;
      return prevServers.map(server => 
        server.id === serverId 
          ? { ...server, ...updates }
          : server
      );
    });
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

  useEffect(() => {
    fetchPublicServers();
  }, []);

  useEffect(() => {
    if (session) {
      fetchUserServers();
    }
  }, [session, fetchUserServers]);

  const refreshAllServers = useCallback(async () => {
    await fetchPublicServers();
    if (session) {
      await fetchUserServers();
    }
  }, [session, fetchUserServers]);

  return (
    <>
      {/* <Suspense fallback={null}> */}
        <OAuthCallbackHandler onRefreshServers={refreshAllServers} />
      {/* </Suspense> */}
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
        onRefreshPublic={fetchPublicServers}
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

export default function McpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <McpPageContent />
    </Suspense>
  );
}

