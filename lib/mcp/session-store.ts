import { MCPOAuthClient } from './oauth-client';

/**
 * Session store for managing MCP client instances
 *
 * Note: This is an in-memory implementation suitable for development.
 * For production, use Redis or a database-backed solution.
 */
export class SessionStore {
  private clients = new Map<string, MCPOAuthClient>();
  private serverToSession = new Map<string, string>(); // Maps server name to session ID

  /**
   * Store a client instance with a session ID
   */
  setClient(sessionId: string, client: MCPOAuthClient): void {
    this.clients.set(sessionId, client);
  }

  /**
   * Retrieve a client instance by session ID
   */
  getClient(sessionId: string): MCPOAuthClient | null {
    return this.clients.get(sessionId) || null;
  }

  /**
   * Remove a client from the store and disconnect it
   */
  removeClient(sessionId: string): void {
    const client = this.clients.get(sessionId);
    if (client) {
      client.disconnect();
      this.clients.delete(sessionId);
    }

    // Also remove from server mapping
    for (const [serverName, sid] of this.serverToSession.entries()) {
      if (sid === sessionId) {
        this.serverToSession.delete(serverName);
        break;
      }
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get all active session IDs
   */
  getAllSessionIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Clear all sessions
   */
  clearAll(): void {
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
    this.serverToSession.clear();
  }

  /**
   * Map a server name to a session ID
   */
  setServerSession(serverName: string, sessionId: string): void {
    this.serverToSession.set(serverName, sessionId);
  }

  /**
   * Get session ID for a server name
   */
  getServerSession(serverName: string): string | null {
    return this.serverToSession.get(serverName) || null;
  }

  /**
   * Remove server session mapping
   */
  removeServerSession(serverName: string): void {
    const sessionId = this.serverToSession.get(serverName);
    if (sessionId) {
      this.removeClient(sessionId);
    }
    this.serverToSession.delete(serverName);
  }

  /**
   * Get client by server name
   */
  getClientByServer(serverName: string): MCPOAuthClient | null {
    const sessionId = this.getServerSession(serverName);
    return sessionId ? this.getClient(sessionId) : null;
  }
}

// Global singleton instance
export const sessionStore = new SessionStore();
