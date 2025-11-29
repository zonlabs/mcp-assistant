"use client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import McpClientLayout from "@/components/mcp-client/McpClientLayout";
import OAuthCallbackHandler from "@/components/mcp-client/OAuthCallbackHandler";
import { McpServer, ToolInfo } from "@/types/mcp";
import { connectionStore } from "@/lib/mcp/connection-store";
import { useMcpServersPagination } from "@/hooks/useMcpServersPagination";

function McpPageContent() {
  const { data: session } = useSession();
  const [userServers, setUserServers] = useState<McpServer[] | null>(null);
  const [userServersCount, setUserServersCount] = useState(0);
  const [userError, setUserError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

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

  const handleServerAction = async (server: McpServer, action: 'activate' | 'deactivate') => {
    try {
      // Handle activate action directly with MCP connect API
      if (action === 'activate') {
        // Use server data directly from the argument
        if (!server.url) {
          throw new Error('Server URL is required');
        }

        // For now, only support stdio and websocket via GraphQL
        // HTTP-based transports (sse, streamable_http) need proper server implementation
        if (server.transport === 'stdio' || server.transport === 'websocket') {
          throw new Error(`Transport type '${server.transport}' must use the Django GraphQL connection. HTTP-based connection only supports servers with proper SSE/HTTP streaming endpoints.`);
        }

        // Normalize URL based on transport type
        let normalizedUrl = server.url;

        if (server.transport === 'sse') {
          // SSE transport requires /sse endpoint - ensure it's present
          if (!normalizedUrl.endsWith('/sse')) {
            normalizedUrl = normalizedUrl + '/sse';
          }
        } else if (server.transport === 'streamable_http') {
          // StreamableHTTP uses the base URL - remove /sse or /message suffix if present
          if (normalizedUrl.endsWith('/sse')) {
            normalizedUrl = normalizedUrl.slice(0, -4);
          } else if (normalizedUrl.endsWith('/message')) {
            normalizedUrl = normalizedUrl.slice(0, -8);
          }
        }

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
            serverName: server.name, // Pass server name so it can be included in OAuth state
            transportType: server.transport, // Pass transport type (sse, streamable_http, etc.)
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
        let tools: ToolInfo[] = [];
        if (connectResult.success && connectResult.sessionId) {
          const toolsResponse = await fetch(`/api/mcp/tool/list?sessionId=${connectResult.sessionId}`);

          if (toolsResponse.ok) {
            const toolsResult = await toolsResponse.json();
            tools = toolsResult.tools || [];
          } else {
            const errorData = await toolsResponse.json();
            console.error('[MCP Connect] Failed to fetch tools:', errorData);
          }
        }

        // Store connection in localStorage
        if (connectResult.success && connectResult.sessionId) {
          connectionStore.set(server.name, {
            sessionId: connectResult.sessionId,
            connectionStatus: 'CONNECTED',
            tools: tools,
            transport: server.transport,
            url: server.url,
          });
        }

        // Update local state - hook will pick up from localStorage
        setUserServers(prev => prev ? prev.map(s => {
          if (s.name === server.name) {
            return {
              ...s,
              connectionStatus: 'CONNECTED',
              tools: tools,
              updated_at: new Date().toISOString()
            };
          }
          return s;
        }) : prev);

        // Refetch public servers to update from localStorage
        refetchPublicServers();

        return { success: true, tools };
      }

      // Handle deactivate action directly with MCP disconnect API
      if (action === 'deactivate') {
        // Get sessionId from localStorage
        const connectionInfo = connectionStore.get(server.name);

        if (!connectionInfo || !connectionInfo.sessionId) {
          throw new Error('Connection information not found. Server may already be disconnected.');
        }

        // Use serverUrl from the server object argument
        if (!server.url) {
          throw new Error('Server URL is required');
        }

        const response = await fetch('/api/mcp/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deactivate',
            serverName: server.name,
            sessionId: connectionInfo.sessionId,
            serverUrl: server.url,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.errors) {
          throw new Error(result.errors?.[0]?.message || 'Deactivation failed');
        }

        // Remove from localStorage
        connectionStore.remove(server.name);

        // Update local state - hook will pick up from localStorage
        setUserServers(prev => prev ? prev.map(s => {
          if (s.name === server.name) {
            return {
              ...s,
              connectionStatus: 'DISCONNECTED',
              tools: [],
              updated_at: new Date().toISOString()
            };
          }
          return s;
        }) : prev);

        // Refetch public servers to update from localStorage
        refetchPublicServers();

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

  // Handle OAuth callback redirect
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const step = searchParams.get('step');
    const sessionId = searchParams.get('sessionId');
    const serverName = searchParams.get('server');

    if (step === 'success' && sessionId && serverName) {
      // OAuth authorization completed, fetch server config then tools

      // First, fetch server config to get transport and url
      fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query($name: String!) {
              mcpServers(filters: { name: { exact: $name } }) {
                edges {
                  node {
                    name
                    transport
                    url
                  }
                }
              }
            }
          `,
          variables: { name: serverName }
        }),
      })
        .then(res => res.json())
        .then(configResult => {
          const serverConfig = configResult.data?.mcpServers?.edges?.[0]?.node;

          if (!serverConfig) {
            throw new Error('Server configuration not found');
          }

          // Now fetch tools
          return fetch(`/api/mcp/tool/list?sessionId=${sessionId}`)
            .then(res => res.json())
            .then(data => {
              const tools = data.tools || [];

              // Store connection in localStorage with transport and url
              connectionStore.set(serverName, {
                sessionId: sessionId,
                connectionStatus: 'CONNECTED',
                tools: tools,
                transport: serverConfig.transport,
                url: serverConfig.url,
              });

              // Update server state with connection status and tools
              setUserServers(prev => prev ? prev.map(server => {
                if (server.name === serverName) {
                  return {
                    ...server,
                    connectionStatus: 'CONNECTED',
                    tools: tools,
                    updated_at: new Date().toISOString()
                  };
                }
                return server;
              }) : prev);

              // Refetch public servers to update from localStorage
              refetchPublicServers();

              toast.success(`Connected to ${serverName} successfully`);

              // Clean up URL
              window.history.replaceState({}, '', '/mcp');
            });
        })
        .catch(error => {
          console.error('[OAuth Callback] Failed:', error);
          toast.error('Connected but failed to fetch server data');
          window.history.replaceState({}, '', '/mcp');
        });
    } else if (step === 'error') {
      const errorMsg = searchParams.get('error') || 'OAuth authorization failed';
      toast.error(errorMsg);
      window.history.replaceState({}, '', '/mcp');
    }
  }, []);

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

export default function McpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <McpPageContent />
    </Suspense>
  );
}

