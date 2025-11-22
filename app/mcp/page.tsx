"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import McpClientLayout from "@/components/mcp-client/McpClientLayout";
import OAuthCallbackHandler from "@/components/mcp-client/OAuthCallbackHandler";
import { McpServer } from "@/types/mcp";
import { connectionStore } from "@/lib/mcp/connection-store";

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

      // Merge with stored connection state from localStorage
      const storedConnections = connectionStore.getAll();
      const mergedServers = servers.map((server: McpServer) => {
        const stored = storedConnections[server.name];
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

      setPublicServers(mergedServers);
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

      // Merge with stored connection state from localStorage
      const storedConnections = connectionStore.getAll();
      const mergedServers = userServersList.map((server: McpServer) => {
        const stored = storedConnections[server.name];
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

  const handleServerAction = async (serverName: string, action: 'restart' | 'activate' | 'deactivate') => {
    try {
      // Handle activate action directly with MCP connect API
      if (action === 'activate') {
        // Step 1: Fetch server config from GraphQL
        const configResponse = await fetch('/api/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query GetServerConfig($name: String!) {
                mcpServers(filters: { name: { exact: $name } }, first: 1) {
                  edges {
                    node {
                      id
                      name
                      transport
                      url
                      command
                      args
                      requiresOauth2
                      description
                      isPublic
                      owner
                    }
                  }
                }
              }
            `,
            variables: { name: serverName }
          }),
        });

        const configResult = await configResponse.json();
        const serverConfig = configResult.data?.mcpServers?.edges?.[0]?.node;

        if (!serverConfig) {
          throw new Error('Server not found');
        }

        if (!serverConfig.url) {
          throw new Error('Server URL is required');
        }

        // For now, only support stdio and websocket via GraphQL
        // HTTP-based transports (sse, streamable_http) need proper server implementation
        if (serverConfig.transport === 'stdio' || serverConfig.transport === 'websocket') {
          throw new Error(`Transport type '${serverConfig.transport}' must use the Django GraphQL connection. HTTP-based connection only supports servers with proper SSE/HTTP streaming endpoints.`);
        }

        // Normalize URL - remove /sse or /message suffix
        let normalizedUrl = serverConfig.url;
        if (normalizedUrl.endsWith('/sse')) {
          normalizedUrl = normalizedUrl.slice(0, -4);
        } else if (normalizedUrl.endsWith('/message')) {
          normalizedUrl = normalizedUrl.slice(0, -8);
        }

        console.log('[MCP Connect] Server:', serverName);
        console.log('[MCP Connect] Transport:', serverConfig.transport);
        console.log('[MCP Connect] Original URL:', serverConfig.url);
        console.log('[MCP Connect] Normalized URL:', normalizedUrl);

        // Step 2: Connect to MCP server
        const callbackUrl = `${window.location.origin}/api/mcp/auth/callback`;
        const connectResponse = await fetch('/api/mcp/auth/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverUrl: normalizedUrl,
            callbackUrl: callbackUrl,
            serverName: serverName, // Pass server name so it can be included in OAuth state
          }),
        });

        const connectResult = await connectResponse.json();

        // Handle OAuth requirement
        if (connectResult.requiresAuth && connectResult.authUrl) {
          window.location.href = connectResult.authUrl;
          return { success: false, requiresAuth: true };
        }

        // Handle connection error
        if (connectResult.error) {
          throw new Error(connectResult.error);
        }

        // Step 3: Fetch tools from connected server
        let tools: unknown[] = [];
        if (connectResult.success && connectResult.sessionId) {
          console.log('[MCP Connect] Fetching tools for sessionId:', connectResult.sessionId);
          const toolsResponse = await fetch(`/api/mcp/tool/list?sessionId=${connectResult.sessionId}`);
          console.log('[MCP Connect] Tools response status:', toolsResponse.status);

          if (toolsResponse.ok) {
            const toolsResult = await toolsResponse.json();
            tools = toolsResult.tools || [];
            console.log('[MCP Connect] Received', tools.length, 'tools');
          } else {
            const errorData = await toolsResponse.json();
            console.error('[MCP Connect] Failed to fetch tools:', errorData);
          }
        }

        // Store connection in localStorage
        if (connectResult.success && connectResult.sessionId) {
          connectionStore.set(serverName, {
            sessionId: connectResult.sessionId,
            connectionStatus: 'CONNECTED',
            tools: tools,
          });
          console.log('[MCP Connect] Stored connection in localStorage');
        }

        // Update local state
        const updateServer = (server: McpServer) => {
          if (server.name === serverName) {
            return {
              ...server,
              connectionStatus: 'CONNECTED',
              tools: tools,
              updated_at: new Date().toISOString()
            };
          }
          return server;
        };

        setPublicServers(prev => prev ? prev.map(updateServer) : prev);
        setUserServers(prev => prev ? prev.map(updateServer) : prev);

        return { success: true, tools };
      }

      // Handle deactivate action directly with MCP disconnect API
      if (action === 'deactivate') {
        // We don't have the sessionId on frontend, so we'll use the actions endpoint for now
        // In a real implementation, we'd need to track sessionIds on the frontend too
        const response = await fetch('/api/mcp/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deactivate',
            serverName
          }),
        });

        const result = await response.json();

        if (!response.ok || result.errors) {
          throw new Error(result.errors?.[0]?.message || 'Deactivation failed');
        }

        // Remove from localStorage
        connectionStore.remove(serverName);
        console.log('[MCP Deactivate] Removed connection from localStorage');

        // Update local state
        const updateServer = (server: McpServer) => {
          if (server.name === serverName) {
            return {
              ...server,
              connectionStatus: 'DISCONNECTED',
              tools: [],
              updated_at: new Date().toISOString()
            };
          }
          return server;
        };

        setPublicServers(prev => prev ? prev.map(updateServer) : prev);
        setUserServers(prev => prev ? prev.map(updateServer) : prev);

        return { success: true };
      }

      // Handle restart with actions endpoint
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

      // Check if OAuth authorization is required for restart
      if (action === 'restart') {
        const actionResult = result.data?.restartMcpServer;

        if (actionResult?.requiresAuth && actionResult?.authorizationUrl) {
          window.location.href = actionResult.authorizationUrl;
          return actionResult;
        }
      }

      // Get the response data for the specific action
      const actionResponse = result.data?.restartMcpServer;
      const updatedServer = actionResponse?.server;

      // Update local state
      setPublicServers(prevServers => {
        if (!prevServers) return prevServers;
        return prevServers.map(server => {
          if (server.name === serverName) {
            let newConnectionStatus = updatedServer?.connectionStatus;

            if (actionResponse && actionResponse.success === false) {
              newConnectionStatus = 'FAILED';
            } else if (!newConnectionStatus) {
              newConnectionStatus = 'CONNECTED';
            } else {
              newConnectionStatus = newConnectionStatus.toUpperCase();
            }

            return {
              ...server,
              connectionStatus: newConnectionStatus,
              tools: newConnectionStatus === 'FAILED' ? [] : (updatedServer?.tools || server.tools),
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
            let newConnectionStatus = updatedServer?.connectionStatus;

            if (actionResponse && actionResponse.success === false) {
              newConnectionStatus = 'FAILED';
            } else if (!newConnectionStatus) {
              newConnectionStatus = 'CONNECTED';
            } else {
              newConnectionStatus = newConnectionStatus.toUpperCase();
            }

            return {
              ...server,
              connectionStatus: newConnectionStatus,
              tools: newConnectionStatus === 'FAILED' ? [] : (updatedServer?.tools || server.tools),
              updated_at: new Date().toISOString()
            };
          }
          return server;
        });
      });

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

  // Handle OAuth callback redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const step = searchParams.get('step');
    const sessionId = searchParams.get('sessionId');
    const serverName = searchParams.get('server');

    if (step === 'success' && sessionId && serverName) {
      // OAuth authorization completed, now fetch tools and update state
      console.log('[OAuth Callback] Fetching tools for', serverName, 'sessionId:', sessionId);

      fetch(`/api/mcp/tool/list?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          const tools = data.tools || [];
          console.log('[OAuth Callback] Received tools:', tools.length);

          // Store connection in localStorage BEFORE cleaning up URL
          connectionStore.set(serverName, {
            sessionId: sessionId,
            connectionStatus: 'CONNECTED',
            tools: tools,
          });
          console.log('[OAuth Callback] Stored connection in localStorage');

          // Update server state with connection status and tools
          const updateServer = (server: McpServer) => {
            if (server.name === serverName) {
              return {
                ...server,
                connectionStatus: 'CONNECTED',
                tools: tools,
                updated_at: new Date().toISOString()
              };
            }
            return server;
          };

          setPublicServers(prev => prev ? prev.map(updateServer) : prev);
          setUserServers(prev => prev ? prev.map(updateServer) : prev);

          toast.success(`Connected to ${serverName} successfully`);

          // Clean up URL
          window.history.replaceState({}, '', '/mcp');
        })
        .catch(error => {
          console.error('[OAuth Callback] Failed to fetch tools:', error);
          toast.error('Connected but failed to fetch tools');
        });
    } else if (step === 'error') {
      const errorMsg = searchParams.get('error') || 'OAuth authorization failed';
      toast.error(errorMsg);
      window.history.replaceState({}, '', '/mcp');
    }
  }, []);

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

