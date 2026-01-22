import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import toast from 'react-hot-toast';
import type { McpServer, ToolInfo, ParsedRegistryServer } from '@/types/mcp';
import { query } from '@/lib/graphql-client';
import { MCP_SERVERS_QUERY } from '@/lib/graphql';
import { openAuthPopup } from '@/lib/auth-popup-utils';

/**
 * Stored Connection Type
 * Represents an active MCP server connection with its state
 */
export interface StoredConnection {
  sessionId: string;
  serverId: string;
  serverName: string;
  url?: string;
  transport?: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'VALIDATING' | 'FAILED';
  tools: ToolInfo[];
  connectedAt: string;
}

/**
 * Server State Slice
 * Manages MCP server catalog (both public and user servers)
 */
interface ServerState {
  // Public servers (paginated from registry)
  publicServers: McpServer[];
  publicServersLoading: boolean;
  publicServersError: string | null;
  publicServersCursor: string | null;
  publicServersHasNext: boolean;
  publicServersTotalCount: number;

  // User's personal servers
  userServers: McpServer[];
  userServersLoading: boolean;
  userServersError: string | null;
  userServersTotalCount: number;

  // Registry servers (external registry)
  registryServers: ParsedRegistryServer[];
  registryLoading: boolean;
  registryError: string | null;
  registryNextCursor: string | null;
  registryCurrentCursor: string | null;
  registryCursorHistory: string[];
}

/**
 * Connection State Slice
 * Manages active MCP connections and their status
 */
interface ConnectionState {
  connections: Record<string, StoredConnection>;
  connectionsLoading: boolean;
  isValidating: boolean;
  validationProgress: { validated: number; total: number } | null;
  activeConnectionCount: number;
}

/**
 * UI State Slice
 * Manages UI-specific state like filters, search, selected items
 */
interface UIState {
  // Filters and search
  searchQuery: string;
  selectedCategory: string | null;
  activeTab: 'public' | 'user';

  // Selected items
  selectedServer: McpServer | null;
  selectedRegistryServer: ParsedRegistryServer | null;

  // View modes
  viewMode: 'browse' | 'add' | 'edit';
  editingServer: McpServer | null;

  // Tool tester
  toolTesterOpen: boolean;
  selectedToolName: string | null;

  // Dialogs
  deleteDialogOpen: boolean;
  serverToDelete: string | null;

  // Sidebar
  sidebarOpen: boolean;
}

/**
 * Server Actions
 * Operations for managing server catalog
 */
interface ServerActions {
  // Public servers
  fetchPublicServers: (variables?: {
    first?: number;
    after?: string;
    searchQuery?: string;
    categorySlug?: string;
  }) => Promise<void>;
  loadMorePublicServers: () => Promise<void>;

  // User servers
  fetchUserServers: () => Promise<void>;
  addServer: (server: Partial<McpServer>) => Promise<McpServer | null>;
  updateServer: (serverId: string, updates: Partial<McpServer>) => Promise<McpServer | null>;
  deleteServer: (serverId: string) => Promise<boolean>;

  // Registry servers
  fetchRegistryServers: (search?: string, cursor?: string) => Promise<void>;
  goToNextRegistryPage: () => Promise<void>;
  goToPreviousRegistryPage: () => Promise<void>;
}

/**
 * Connection Actions
 * Operations for managing connections
 */
interface ConnectionActions {
  connect: (server: McpServer) => Promise<void>;
  disconnect: (sessionId: string) => Promise<void>;
  validateSession: (sessionId: string) => Promise<void>;
  validateAllSessions: () => Promise<void>;
  fetchSessionTools: (sessionId: string) => Promise<ToolInfo[]>;
  getConnection: (sessionId: string) => StoredConnection | undefined;
  getConnectionByServerId: (serverId: string) => StoredConnection | undefined;
  getConnectionStatus: (sessionId: string) => string | undefined;
  isServerConnected: (serverId: string) => boolean;
  getServerTools: (sessionId: string) => ToolInfo[] | undefined;
}

/**
 * UI Actions
 * Operations for managing UI state
 */
interface UIActions {
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setActiveTab: (tab: 'public' | 'user') => void;
  setSelectedServer: (server: McpServer | null) => void;
  setSelectedRegistryServer: (server: ParsedRegistryServer | null) => void;
  setViewMode: (mode: 'browse' | 'add' | 'edit') => void;
  setEditingServer: (server: McpServer | null) => void;
  openToolTester: (toolName: string) => void;
  closeToolTester: () => void;
  openDeleteDialog: (serverId: string) => void;
  closeDeleteDialog: () => void;
  toggleSidebar: () => void;
  resetUIState: () => void;
}

/**
 * Combined MCP Store Type
 */
export type McpStore = ServerState &
  ConnectionState &
  UIState &
  ServerActions &
  ConnectionActions &
  UIActions;

/**
 * Initial state values
 */
const initialServerState: ServerState = {
  publicServers: [],
  publicServersLoading: false,
  publicServersError: null,
  publicServersCursor: null,
  publicServersHasNext: false,
  publicServersTotalCount: 0,

  userServers: [],
  userServersLoading: false,
  userServersError: null,
  userServersTotalCount: 0,

  registryServers: [],
  registryLoading: false,
  registryError: null,
  registryNextCursor: null,
  registryCurrentCursor: null,
  registryCursorHistory: [],
};

const initialConnectionState: ConnectionState = {
  connections: {},
  connectionsLoading: false,
  isValidating: false,
  validationProgress: null,
  activeConnectionCount: 0,
};

const initialUIState: UIState = {
  searchQuery: '',
  selectedCategory: null,
  activeTab: 'public',
  selectedServer: null,
  selectedRegistryServer: null,
  viewMode: 'browse',
  editingServer: null,
  toolTesterOpen: false,
  selectedToolName: null,
  deleteDialogOpen: false,
  serverToDelete: null,
  sidebarOpen: true,
};

/**
 * Main MCP Zustand Store
 * Centralized state management for all MCP-related data
 * Uses persist middleware to store connections in localStorage
 */
export const useMcpStore = create<McpStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ==================== STATE ====================
        ...initialServerState,
        ...initialConnectionState,
        ...initialUIState,

      // ==================== SERVER ACTIONS ====================

      /**
       * Fetch public servers with optional filters and pagination
       */
      fetchPublicServers: async (variables = {}) => {
        set({ publicServersLoading: true, publicServersError: null });

        try {
          const filters: any = {};
          if (variables.categorySlug) {
            filters.categorySlug = variables.categorySlug;
          }

          const data = await query<{ mcpServers: any }>(MCP_SERVERS_QUERY, {
            first: variables.first || 20,
            after: variables.after || null,
            filters: Object.keys(filters).length > 0 ? filters : null,
            order: { createdAt: 'DESC' },
          });

          const servers = data.mcpServers.edges.map((edge: any) => edge.node);

          set({
            publicServers: variables.after ? [...get().publicServers, ...servers] : servers,
            publicServersCursor: data.mcpServers.pageInfo.endCursor,
            publicServersHasNext: data.mcpServers.pageInfo.hasNextPage,
            publicServersTotalCount: data.mcpServers.totalCount,
            publicServersLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch servers';
          set({
            publicServersError: errorMessage,
            publicServersLoading: false,
          });
          toast.error(errorMessage);
        }
      },

      /**
       * Load more public servers (pagination)
       */
      loadMorePublicServers: async () => {
        const { publicServersCursor, publicServersHasNext } = get();
        if (!publicServersHasNext || !publicServersCursor) return;

        await get().fetchPublicServers({ after: publicServersCursor });
      },

      /**
       * Fetch user's personal servers
       */
      fetchUserServers: async () => {
        set({ userServersLoading: true, userServersError: null });

        try {
          const response = await fetch('/api/mcp/user');

          if (!response.ok) {
            throw new Error('Failed to fetch user servers');
          }

          const data = await response.json();

          set({
            userServers: data.servers || [],
            userServersTotalCount: data.servers?.length || 0,
            userServersLoading: false,
          });
        } catch (error) {
          set({
            userServersError: error instanceof Error ? error.message : 'Unknown error',
            userServersLoading: false,
          });
        }
      },

      /**
       * Add a new server
       */
      addServer: async (server) => {
        try {
          const response = await fetch('/api/mcp/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(server),
          });

          if (!response.ok) {
            throw new Error('Failed to add server');
          }

          const { data: newServer } = await response.json();

          // Add to user servers list
          set((state) => ({
            userServers: [...state.userServers, newServer],
            userServersTotalCount: state.userServersTotalCount + 1,
          }));

          toast.success(`Server ${newServer.name} added successfully`);
          return newServer;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to add server';
          console.error('Error adding server:', error);
          toast.error(errorMessage);
          return null;
        }
      },

      /**
       * Update an existing server
       */
      updateServer: async (serverId, updates) => {
        try {
          const response = await fetch('/api/mcp/servers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: serverId, ...updates }),
          });

          if (!response.ok) {
            throw new Error('Failed to update server');
          }

          const { data: updatedServer } = await response.json();

          // Update in user servers list
          set((state) => ({
            userServers: state.userServers.map((s) =>
              s.id === serverId ? updatedServer : s
            ),
          }));

          toast.success(`Server ${updatedServer.name} updated successfully`);
          return updatedServer;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update server';
          console.error('Error updating server:', error);
          toast.error(errorMessage);
          return null;
        }
      },

      /**
       * Delete a server
       */
      deleteServer: async (serverId) => {
        try {
          const response = await fetch(`/api/mcp/servers?id=${serverId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete server');
          }

          // Remove from user servers list
          set((state) => ({
            userServers: state.userServers.filter((s) => s.id !== serverId),
            userServersTotalCount: state.userServersTotalCount - 1,
          }));

          toast.success('Server deleted successfully');
          return true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete server';
          console.error('Error deleting server:', error);
          toast.error(errorMessage);
          return false;
        }
      },

      /**
       * Fetch registry servers
       */
      fetchRegistryServers: async (search = '', cursor) => {
        set({ registryLoading: true, registryError: null });

        try {
          const params = new URLSearchParams({
            limit: '20',
            ...(search && { search }),
            ...(cursor && { cursor }),
          });

          const response = await fetch(`/api/registry?${params}`);

          if (!response.ok) {
            throw new Error('Failed to fetch registry servers');
          }

          const data = await response.json();

          set({
            registryServers: data.servers || [],
            registryNextCursor: data.nextCursor || null,
            registryCurrentCursor: cursor || null,
            registryLoading: false,
          });
        } catch (error) {
          set({
            registryError: error instanceof Error ? error.message : 'Unknown error',
            registryLoading: false,
          });
        }
      },

      /**
       * Navigate to next registry page
       */
      goToNextRegistryPage: async () => {
        const { registryNextCursor, registryCurrentCursor, registryCursorHistory } = get();
        if (!registryNextCursor) return;

        // Save current cursor to history
        if (registryCurrentCursor) {
          set({ registryCursorHistory: [...registryCursorHistory, registryCurrentCursor] });
        }

        await get().fetchRegistryServers(get().searchQuery, registryNextCursor);
      },

      /**
       * Navigate to previous registry page
       */
      goToPreviousRegistryPage: async () => {
        const { registryCursorHistory } = get();
        if (registryCursorHistory.length === 0) return;

        const previousCursor = registryCursorHistory[registryCursorHistory.length - 1];
        set({ registryCursorHistory: registryCursorHistory.slice(0, -1) });

        await get().fetchRegistryServers(get().searchQuery, previousCursor);
      },

      // ==================== CONNECTION ACTIONS ====================

      /**
       * Connect to a server
       * Immediately stores the connection with VALIDATING status and fetches tools
       */
      connect: async (server) => {
        try {
          const callbackUrl = `${window.location.origin}/api/mcp/auth/callback`;

          const response = await fetch('/api/mcp/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serverId: server.id,
              serverUrl: server.url,
              serverName: server.name,
              transportType: server.transport,
              callbackUrl,
            }),
          });

          const result = await response.json();

          // Handle non-OK responses (except 401 which might be OAuth requirement)
          if (!response.ok && response.status !== 401) {
            throw new Error(result.error || 'Failed to connect to server');
          }

          let sessionId = result.sessionId;

          // Immediately store connection with VALIDATING status
          if (sessionId) {
            console.log('[MCP Store] Storing connection with VALIDATING status:', {
              sessionId,
              serverId: server.id,
              serverName: server.name,
            });

            set((state) => ({
              connections: {
                ...state.connections,
                [sessionId]: {
                  sessionId,
                  serverId: server.id,
                  serverName: server.name,
                  url: server.url || undefined,
                  transport: server.transport,
                  connectionStatus: 'VALIDATING',
                  tools: [],
                  connectedAt: new Date().toISOString(),
                },
              },
            }));
          }

          // If OAuth redirect is needed, handle it with popup
          if (result.requiresAuth || result.authUrl) {
            try {
              toast.loading('Opening authorization window...', { id: 'auth-popup' });

              // Open OAuth popup and wait for completion
              const authResult = await openAuthPopup({ url: result.authUrl });
              sessionId = authResult.sessionId;

              toast.dismiss('auth-popup');
              toast.success('Authorization completed successfully');
            } catch (error) {
              toast.dismiss('auth-popup');

              // Mark as FAILED on auth error
              if (sessionId) {
                set((state) => ({
                  connections: {
                    ...state.connections,
                    [sessionId]: {
                      ...state.connections[sessionId],
                      connectionStatus: 'FAILED',
                    },
                  },
                }));
              }

              const errorMessage = error instanceof Error ? error.message : 'Authorization failed';
              toast.error(errorMessage);
              throw error;
            }
          }

          // Validate the session (fetch tools)
          if (sessionId) {
            await get().validateSession(sessionId);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to connect to server';
          console.error('[MCP Store] Connection error:', error);
          toast.error(errorMessage);
          throw error;
        }
      },

      /**
       * Disconnect from a server
       */
      disconnect: async (sessionId) => {
        try {
          const connection = get().connections[sessionId];
          const serverName = connection?.serverName || 'server';

          const response = await fetch('/api/mcp/disconnect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });

          if (!response.ok) {
            throw new Error('Failed to disconnect from server');
          }

          // Remove from connections
          set((state) => {
            const { [sessionId]: removed, ...rest } = state.connections;
            const activeCount = Object.values(rest).filter(
              (c) => c.connectionStatus === 'CONNECTED'
            ).length;

            return {
              connections: rest,
              activeConnectionCount: activeCount,
            };
          });

          toast.success(`Disconnected from ${serverName}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect from server';
          console.error('[MCP Store] Disconnect error:', error);
          toast.error(errorMessage);
          throw error;
        }
      },

      /**
       * Validate a single session
       * Fetches tools and updates connection status
       */
      validateSession: async (sessionId) => {
        const connection = get().connections[sessionId];
        if (!connection) {
          console.warn('[MCP Store] Cannot validate non-existent session:', sessionId);
          return;
        }

        try {
          // Set to VALIDATING if not already
          if (connection.connectionStatus !== 'VALIDATING') {
            set((state) => ({
              connections: {
                ...state.connections,
                [sessionId]: {
                  ...state.connections[sessionId],
                  connectionStatus: 'VALIDATING',
                },
              },
            }));
          }

          const tools = await get().fetchSessionTools(sessionId);

          // Update connection with tools and CONNECTED status
          set((state) => {
            const prevConnection = state.connections[sessionId];
            const prevActiveCount = Object.values(state.connections).filter(
              (c) => c.connectionStatus === 'CONNECTED'
            ).length;

            const wasConnected = prevConnection?.connectionStatus === 'CONNECTED';
            const isNowConnected = true;

            return {
              connections: {
                ...state.connections,
                [sessionId]: {
                  ...prevConnection,
                  connectionStatus: 'CONNECTED',
                  tools,
                },
              },
              activeConnectionCount: wasConnected
                ? prevActiveCount
                : prevActiveCount + 1,
            };
          });

          console.log('[MCP Store] Session validated:', {
            sessionId,
            toolCount: tools.length,
          });
        } catch (error) {
          console.error('[MCP Store] Session validation failed:', sessionId, error);

          // Mark as FAILED
          set((state) => ({
            connections: {
              ...state.connections,
              [sessionId]: {
                ...state.connections[sessionId],
                connectionStatus: 'FAILED',
              },
            },
          }));
        }
      },

      /**
       * Validate all sessions
       * Runs validation for all stored sessions progressively
       */
      validateAllSessions: async () => {
        const connections = get().connections;
        const sessionIds = Object.keys(connections);

        if (sessionIds.length === 0) return;

        set({ isValidating: true, validationProgress: { validated: 0, total: sessionIds.length } });

        // Validate each session progressively
        for (let i = 0; i < sessionIds.length; i++) {
          await get().validateSession(sessionIds[i]);

          set({
            validationProgress: { validated: i + 1, total: sessionIds.length },
          });
        }

        set({ isValidating: false, validationProgress: null });
      },

      /**
       * Fetch tools for a specific session
       */
      fetchSessionTools: async (sessionId) => {
        try {
          const response = await fetch(`/api/mcp/tool/list?sessionId=${sessionId}`);

          if (!response.ok) {
            // Auth errors (401, 403) should mark connection as invalid
            if (response.status === 401 || response.status === 403) {
              throw new Error('Session expired or unauthorized');
            }
            throw new Error('Failed to fetch tools');
          }

          const data = await response.json();
          return data.tools || [];
        } catch (error) {
          console.error('[MCP Store] Failed to fetch tools:', sessionId, error);
          throw error;
        }
      },

      /**
       * Get connection by session ID
       */
      getConnection: (sessionId) => {
        return get().connections[sessionId];
      },

      /**
       * Get connection by server ID
       */
      getConnectionByServerId: (serverId) => {
        return Object.values(get().connections).find((c) => c.serverId === serverId);
      },

      /**
       * Get connection status
       */
      getConnectionStatus: (sessionId) => {
        return get().connections[sessionId]?.connectionStatus;
      },

      /**
       * Check if server is connected
       */
      isServerConnected: (serverId) => {
        return Object.values(get().connections).some(
          (c) => c.serverId === serverId && c.connectionStatus === 'CONNECTED'
        );
      },

      /**
       * Get tools for a connection
       */
      getServerTools: (sessionId) => {
        return get().connections[sessionId]?.tools;
      },

      // ==================== UI ACTIONS ====================

      setSearchQuery: (query) => set({ searchQuery: query }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedServer: (server) => set({ selectedServer: server }),
      setSelectedRegistryServer: (server) => set({ selectedRegistryServer: server }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setEditingServer: (server) => set({ editingServer: server }),

      openToolTester: (toolName) =>
        set({ toolTesterOpen: true, selectedToolName: toolName }),

      closeToolTester: () =>
        set({ toolTesterOpen: false, selectedToolName: null }),

      openDeleteDialog: (serverId) =>
        set({ deleteDialogOpen: true, serverToDelete: serverId }),

      closeDeleteDialog: () =>
        set({ deleteDialogOpen: false, serverToDelete: null }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      resetUIState: () => set({ ...initialUIState }),
      }),
      {
        name: 'mcp-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist connection state
        partialize: (state) => ({
          connections: state.connections,
          activeConnectionCount: state.activeConnectionCount,
        }),
      }
    ),
    { name: 'MCP Store' }
  )
);

// ==================== SELECTORS ====================

/**
 * Selector: Get servers merged with connection state
 */
export const selectServersWithConnections = (state: McpStore) => {
  const servers = state.activeTab === 'public' ? state.publicServers : state.userServers;

  return servers.map((server) => {
    const connection = Object.values(state.connections).find(
      (c) => c.serverId === server.id
    );

    return {
      ...server,
      connectionStatus: connection?.connectionStatus || 'DISCONNECTED',
      sessionId: connection?.sessionId,
      tools: connection?.tools || server.tools || [],
    };
  });
};

/**
 * Selector: Get filtered servers based on search and category
 */
export const selectFilteredServers = (state: McpStore) => {
  let servers = selectServersWithConnections(state);

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    servers = servers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
    );
  }

  // Apply category filter
  if (state.selectedCategory) {
    servers = servers.filter((s) =>
      s.categories?.some((c) => c.slug === state.selectedCategory)
    );
  }

  return servers;
};

/**
 * Selector: Get all active connections
 */
export const selectActiveConnections = (state: McpStore) => {
  return Object.values(state.connections).filter(
    (c) => c.connectionStatus === 'CONNECTED'
  );
};

/**
 * Selector: Get loading state
 */
export const selectIsLoading = (state: McpStore) => {
  return (
    state.publicServersLoading ||
    state.userServersLoading ||
    state.connectionsLoading ||
    state.registryLoading
  );
};
