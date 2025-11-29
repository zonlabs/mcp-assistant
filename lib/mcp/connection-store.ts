/**
 * Local storage manager for MCP connection state persistence
 *
 * Stores connection metadata including sessionId, tools, and connection status
 * to maintain state across page reloads.
 */

import { ToolInfo } from '@/types/mcp';

export interface StoredConnection {
  sessionId: string;
  serverName: string;
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  transport?: string;
  url?: string;
  // Note: OAuth headers are NOT stored in localStorage for security
  // They are fetched from the server-side session on demand
}

const STORAGE_KEY = 'mcp_connections';
const EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class ConnectionStore {
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

      for (const [serverName, connection] of Object.entries(connections)) {
        if (this.isStoredConnection(connection)) {
          const connectedAt = new Date(connection.connectedAt).getTime();
          if (now - connectedAt < EXPIRY_TIME) {
            validConnections[serverName] = connection;
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
   * Get connection for a specific server
   */
  get(serverName: string): StoredConnection | null {
    const connections = this.getAll();
    return connections[serverName] || null;
  }

  /**
   * Store or update connection for a server
   */
  set(serverName: string, connection: Omit<StoredConnection, 'serverName' | 'connectedAt'> & { connectedAt?: string }): void {
    if (typeof window === 'undefined') return;

    try {
      const connections = this.getAll();

      connections[serverName] = {
        ...connection,
        serverName,
        connectedAt: connection.connectedAt || new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
    } catch (error) {
      console.error('[ConnectionStore] Failed to store connection:', error);
    }
  }

  /**
   * Update connection status and tools
   */
  update(serverName: string, updates: Partial<StoredConnection>): void {
    const existing = this.get(serverName);
    if (!existing) {
      console.warn('[ConnectionStore] Cannot update non-existent connection:', serverName);
      return;
    }

    this.set(serverName, {
      ...existing,
      ...updates,
    });
  }

  /**
   * Remove connection for a server
   */
  remove(serverName: string): void {
    if (typeof window === 'undefined') return;

    try {
      const connections = this.getAll();
      delete connections[serverName];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
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
    } catch (error) {
      console.error('[ConnectionStore] Failed to clear connections:', error);
    }
  }

  /**
   * Get sessionId for a server
   */
  getSessionId(serverName: string): string | null {
    const connection = this.get(serverName);
    return connection?.sessionId || null;
  }

  /**
   * Check if a server has an active connection
   */
  hasConnection(serverName: string): boolean {
    const connection = this.get(serverName);
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
      'serverName' in value &&
      'connectionStatus' in value &&
      'tools' in value &&
      'connectedAt' in value
    );
  }

  /**
   * Validate a connection by checking if its sessionId is still active on the backend
   * Removes the connection from localStorage if invalid
   * Returns the tools and headers data if valid, null if invalid
   */
  async validateConnection(serverName: string): Promise<{ tools: ToolInfo[], headers: Record<string, string> | null } | null> {
    if (typeof window === 'undefined') return null;

    const connection = this.get(serverName);
    if (!connection || !connection.sessionId) {
      return null;
    }

    try {
      // Try to list tools using the sessionId - this validates the session
      const response = await fetch(`/api/mcp/tool/list?sessionId=${connection.sessionId}`);

      if (!response.ok) {
        // Session is invalid, remove from localStorage
        this.remove(serverName);
        return null;
      }

      // Parse and return the data for reuse
      const data = await response.json();
      return {
        tools: data.tools || [],
        headers: data.headers || null
      };
    } catch (error) {
      console.error('[ConnectionStore] Failed to validate session:', error);
      // On error, assume session is invalid and clean up
      this.remove(serverName);
      return null;
    }
  }

  /**
   * Get all valid connections (validates and cleans up expired ones)
   * Returns a map of valid server names to their tools/headers data
   */
  async getValidConnections(): Promise<Map<string, { tools: ToolInfo[], headers: Record<string, string> | null }>> {
    const connections = this.getAll();
    const validServersData = new Map<string, { tools: ToolInfo[], headers: Record<string, string> | null }>();

    // Validate all connections in parallel
    const validationPromises = Object.keys(connections).map(async (serverName) => {
      const data = await this.validateConnection(serverName);
      if (data) {
        validServersData.set(serverName, data);
      }
      return { serverName, isValid: !!data };
    });

    await Promise.all(validationPromises);

    return validServersData;
  }
}

// Export singleton instance
export const connectionStore = new ConnectionStore();
