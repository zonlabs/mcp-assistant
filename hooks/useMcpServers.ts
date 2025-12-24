"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Session } from "next-auth";
import { McpServer } from "@/types/mcp";
import { MCP_SERVERS_QUERY } from "@/lib/graphql";

interface McpServersData {
  servers: McpServer[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateServer: (serverId: string, updates: Partial<McpServer>) => void;
  handleServerAction: (server: McpServer, action: 'activate' | 'deactivate') => Promise<void>;
  handleServerAdd: (data: any) => Promise<void>;
  handleServerUpdate: (data: any) => Promise<void>;
  handleServerDelete: (serverName: string) => Promise<void>;
}

export function useMcpServers(session: Session | null): McpServersData {
  const [servers, setServers] = useState<McpServer[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch servers from GraphQL API
  const fetchServers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: MCP_SERVERS_QUERY,
          variables: {
            first: 100, // Get first 100 servers
          }
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to fetch servers');
      }

      // Extract nodes from edges structure
      const edges = result.data?.mcpServers?.edges || [];
      const servers = edges.map((edge: any) => edge.node);
      setServers(servers);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch servers';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update server in local state
  const updateServer = useCallback((serverId: string, updates: Partial<McpServer>) => {
    setServers(prevServers => {
      if (!prevServers) return prevServers;
      return prevServers.map(server => 
        server.id === serverId 
          ? { ...server, ...updates }
          : server
      );
    });
  }, []);

  // Handle server actions (activate/deactivate)
  const handleServerAction = useCallback(async (server: McpServer, action: 'activate' | 'deactivate') => {
    try {
      const response = await fetch('/api/mcp/actions', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          serverName: server.name
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Action failed');
      }

      // Check if OAuth authorization is required
      if (action === 'activate') {
        const connectResult = result.data?.connectMcpServer;

        if (connectResult?.requiresAuth) {
          const authUrl = connectResult.authorizationUrl;
          if (authUrl) {
            // toast.success(`Redirecting to authorization server for ${serverName}...`);
            // Redirect to OAuth authorization URL
            setTimeout(() => {
              window.location.href = authUrl;
            }, 500);
            return;
          } else {
            throw new Error('OAuth required but no authorization URL provided');
          }
        }
      }

      // Update local state
      setServers(prevServers => {
        if (!prevServers) return prevServers;
        return prevServers.map(s => {
          if (s.name === server.name) {
            const updatedServer = result.data?.connectMcpServer || result.data?.disconnectMcpServer;
            const newConnectionStatus = updatedServer?.connectionStatus ||
              (action === 'activate' ? 'CONNECTED' : 'DISCONNECTED');

            return {
              ...s,
              connectionStatus: newConnectionStatus,
              tools: (action === 'deactivate' || newConnectionStatus === 'FAILED') ? [] : (updatedServer?.tools || s.tools),
              updatedAt: new Date().toISOString()
            };
          }
          return s;
        });
      });

      // toast.success(`Server ${server.name} ${action}d successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} server`);
      throw error;
    }
  }, []);

  // Handle server CRUD operations
  const handleServerAdd = useCallback(async (data: any) => {
    const response = await fetch('/api/mcp/servers', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to add server');
    }

    await fetchServers();
    toast.success('Server added successfully');
  }, [fetchServers]);

  const handleServerUpdate = useCallback(async (data: any) => {
    const response = await fetch('/api/mcp/servers', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to update server');
    }

    await fetchServers();
    toast.success('Server updated successfully');
  }, [fetchServers]);

  const handleServerDelete = useCallback(async (serverName: string) => {
    const response = await fetch(`/api/mcp/servers?name=${encodeURIComponent(serverName)}`, {
      method: "DELETE",
    });

    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Failed to delete server');
    }

    await fetchServers();
    toast.success('Server deleted successfully');
  }, [fetchServers]);

  // Load servers on mount
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    servers,
    loading,
    error,
    refresh: fetchServers,
    updateServer,
    handleServerAction,
    handleServerAdd,
    handleServerUpdate,
    handleServerDelete,
  };
}
