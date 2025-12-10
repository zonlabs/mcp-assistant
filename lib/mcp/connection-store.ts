/**
 * Local storage manager for MCP connection state persistence
 *
 * Stores connection metadata including sessionId, tools, and connection status
 * to maintain state across page reloads.
 */

import { ToolInfo } from '@/types/mcp';

export interface StoredConnection {
  sessionId: string;
  serverId: string;
  serverName: string; // Kept for OAuth callback compatibility
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  transport?: string;
  url?: string;
  // Note: OAuth headers are NOT stored in localStorage for security
  // They are fetched from the server-side session on demand
}

const STORAGE_KEY = 'mcp_connections';
const EXPIRY_TIME = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

class ConnectionStore {
  private listeners = new Set<() => void>();

  /**
   * Subscribe to connection changes
   * Returns an unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all subscribers of a change
   */
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Get all stored connections
   */
  getAll(): Record<string, StoredConnection> {
    if (typeof window === 'undefined') return {};

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};

      const connections: Record<string, StoredConnection> = JSON.parse(stored);

      // Filter out expired connections
      const now = Date.now();
      const validConnections: Record<string, StoredConnection> = {};

      for (const [serverId, connection] of Object.entries(connections)) {
        if (this.isStoredConnection(connection)) {
          const connectedAt = new Date(connection.connectedAt).getTime();
          if (now - connectedAt < EXPIRY_TIME) {
            validConnections[serverId] = connection;
          }
        }
      }

      // Save back the filtered connections
      if (Object.keys(validConnections).length !== Object.keys(connections).length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validConnections));
      }

      return validConnections;
    } catch (error) {
      console.error('[ConnectionStore] Failed to get connections:', error);
      return {};
    }
  }

  /**
   * Get connection for a specific server by ID
   */
  get(serverId: string): StoredConnection | null {
    const connections = this.getAll();
    return connections[serverId] || null;
  }

  /**
   * Get connection for a server by name (for OAuth callback compatibility)
   */
  getByName(serverName: string): StoredConnection | null {
    const connections = this.getAll();
    for (const connection of Object.values(connections)) {
      if (connection.serverName === serverName) {
        return connection;
      }
    }
    return null;
  }

  /**
   * Store or update connection for a server
   */
  set(serverId: string, connection: Omit<StoredConnection, 'serverId' | 'connectedAt'> & { connectedAt?: string }): void {
    if (typeof window === 'undefined') return;

    try {
      const connections = this.getAll();

      connections[serverId] = {
        ...connection,
        serverId,
        connectedAt: connection.connectedAt || new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
      this.notify(); // Notify subscribers of the change
    } catch (error) {
      console.error('[ConnectionStore] Failed to store connection:', error);
    }
  }

  /**
   * Update connection status and tools
   */
  update(serverId: string, updates: Partial<StoredConnection>): void {
    const existing = this.get(serverId);
    if (!existing) {
      console.warn('[ConnectionStore] Cannot update non-existent connection:', serverId);
      return;
    }

    this.set(serverId, {
      ...existing,
      ...updates,
    });
  }

  /**
   * Remove connection for a server
   */
  remove(serverId: string): void {
    if (typeof window === 'undefined') return;

    try {
      const connections = this.getAll();
      delete connections[serverId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
      this.notify(); // Notify subscribers of the change
    } catch (error) {
      console.error('[ConnectionStore] Failed to remove connection:', error);
    }
  }

  /**
   * Clear all stored connections
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notify(); // Notify subscribers of the change
    } catch (error) {
      console.error('[ConnectionStore] Failed to clear connections:', error);
    }
  }

  /**
   * Get sessionId for a server
   */
  getSessionId(serverId: string): string | null {
    const connection = this.get(serverId);
    return connection?.sessionId || null;
  }

  /**
   * Check if a server has an active connection
   */
  hasConnection(serverId: string): boolean {
    const connection = this.get(serverId);
    return connection?.connectionStatus === 'CONNECTED';
  }

  /**
   * Type guard to check if an unknown value is a StoredConnection
   */
  private isStoredConnection(value: unknown): value is StoredConnection {
    return (
      typeof value === 'object' &&
      value !== null &&
      'sessionId' in value &&
      'serverId' in value &&
      'serverName' in value &&
      'connectionStatus' in value &&
      'tools' in value &&
      'connectedAt' in value
    );
  }

  /**
   * Validate a connection by checking if its sessionId is still active on the backend
   * Removes the connection from localStorage if invalid
   * Returns the tools data if valid, null if invalid
   * NOTE: Headers are NOT returned to client for security - they're fetched server-side
   */
  async validateConnection(serverId: string): Promise<{ tools: ToolInfo[] } | null> {
    if (typeof window === 'undefined') return null;

    const connection = this.get(serverId);
    if (!connection || !connection.sessionId) {
      return null;
    }

    try {
      // Try to list tools using the sessionId - this validates the session
      const response = await fetch(`/api/mcp/tool/list?sessionId=${connection.sessionId}`);

      if (!response.ok) {
        // Session is invalid, remove from localStorage
        this.remove(serverId);
        return null;
      }

      // Parse and return the data for reuse (no headers for security)
      const data = await response.json();
      return {
        tools: data.tools || []
      };
    } catch (error) {
      console.error('[ConnectionStore] Failed to validate session:', error);
      // On error, assume session is invalid and clean up
      this.remove(serverId);
      return null;
    }
  }

  /**
   * Get all valid connections (validates and cleans up expired ones)
   * Returns a map of valid server IDs to their tools data
   * NOTE: Headers are NOT included for security - they're fetched server-side
   *
   * @param filterFn Optional filter function to validate only specific connections
   */
  async getValidConnections(filterFn?: (serverId: string) => boolean): Promise<Map<string, { tools: ToolInfo[] }>> {
    const connections = this.getAll();
    const validServersData = new Map<string, { tools: ToolInfo[] }>();

    // Filter connections if a filter function is provided
    const serverIdsToValidate = Object.keys(connections).filter(serverId =>
      !filterFn || filterFn(serverId)
    );

    // Validate filtered connections in parallel
    const validationPromises = serverIdsToValidate.map(async (serverId) => {
      const data = await this.validateConnection(serverId);
      if (data) {
        validServersData.set(serverId, data);
      }
      return { serverId, isValid: !!data };
    });

    await Promise.all(validationPromises);

    return validServersData;
  }
}

// Export singleton instance
export const connectionStore = new ConnectionStore();
