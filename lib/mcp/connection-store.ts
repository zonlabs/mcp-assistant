/**
 * Local storage manager for MCP connection state persistence
 *
 * Stores connection metadata including sessionId, tools, and connection status
 * to maintain state across page reloads.
 */

export interface StoredConnection {
  sessionId: string;
  serverName: string;
  connectionStatus: string;
  tools: any[];
  connectedAt: string;
  lastChecked?: string;
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
        lastChecked: new Date().toISOString(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
      console.log('[ConnectionStore] Stored connection for:', serverName, 'sessionId:', connection.sessionId);
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
      lastChecked: new Date().toISOString(),
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
      console.log('[ConnectionStore] Removed connection for:', serverName);
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
      console.log('[ConnectionStore] Cleared all connections');
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
}

// Export singleton instance
export const connectionStore = new ConnectionStore();
