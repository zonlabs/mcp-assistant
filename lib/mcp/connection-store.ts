import { ToolInfo } from '@/types/mcp';

export interface StoredConnection {
  sessionId: string;
  serverId: string;
  serverName: string;
  connectionStatus: string;
  tools: ToolInfo[];
  connectedAt: string;
  transport?: string;
  url?: string;
}

const STORAGE_KEY = 'mcp_connections';
const EXPIRY_TIME = 12 * 60 * 60 * 1000;
const AUTH_ERROR_CODES = [401, 403, 404];

class ConnectionStore {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener());
  }

  private isServerSide(): boolean {
    return typeof window === 'undefined';
  }

  private isExpired(connectedAt: string): boolean {
    const now = Date.now();
    const connectionTime = new Date(connectedAt).getTime();
    return now - connectionTime >= EXPIRY_TIME;
  }

  private isValidConnection(value: unknown): value is StoredConnection {
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

  private cleanExpiredConnections(connections: Record<string, StoredConnection>): Record<string, StoredConnection> {
    const validConnections: Record<string, StoredConnection> = {};

    for (const [serverId, connection] of Object.entries(connections)) {
      if (this.isValidConnection(connection) && !this.isExpired(connection.connectedAt)) {
        validConnections[serverId] = connection;
      }
    }

    return validConnections;
  }

  private saveToStorage(connections: Record<string, StoredConnection>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
    } catch (error) {
      console.error('[ConnectionStore] Save failed:', error);
    }
  }

  private loadFromStorage(): Record<string, StoredConnection> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};

      const connections = JSON.parse(stored);
      const cleanedConnections = this.cleanExpiredConnections(connections);

      if (Object.keys(cleanedConnections).length !== Object.keys(connections).length) {
        this.saveToStorage(cleanedConnections);
      }

      return cleanedConnections;
    } catch (error) {
      console.error('[ConnectionStore] Load failed:', error);
      return {};
    }
  }

  getAll(): Record<string, StoredConnection> {
    if (this.isServerSide()) return {};
    return this.loadFromStorage();
  }

  get(serverId: string): StoredConnection | null {
    return this.getAll()[serverId] || null;
  }

  getByName(serverName: string): StoredConnection | null {
    const connections = this.getAll();
    return Object.values(connections).find(conn => conn.serverName === serverName) || null;
  }

  set(serverId: string, connection: Omit<StoredConnection, 'serverId' | 'connectedAt'> & { connectedAt?: string }): void {
    if (this.isServerSide()) return;

    const connections = this.getAll();
    connections[serverId] = {
      ...connection,
      serverId,
      connectedAt: connection.connectedAt || new Date().toISOString(),
    };

    this.saveToStorage(connections);
    this.notify();
  }

  update(serverId: string, updates: Partial<StoredConnection>): void {
    const existing = this.get(serverId);
    if (!existing) {
      console.warn('[ConnectionStore] Cannot update non-existent connection:', serverId);
      return;
    }

    this.set(serverId, { ...existing, ...updates });
  }

  remove(serverId: string): void {
    if (this.isServerSide()) return;

    const connections = this.getAll();
    delete connections[serverId];
    this.saveToStorage(connections);
    this.notify();
  }

  clear(): void {
    if (this.isServerSide()) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      this.notify();
    } catch (error) {
      console.error('[ConnectionStore] Clear failed:', error);
    }
  }

  getSessionId(serverId: string): string | null {
    return this.get(serverId)?.sessionId || null;
  }

  hasConnection(serverId: string): boolean {
    return this.get(serverId)?.connectionStatus === 'CONNECTED';
  }

  private isAuthError(status: number): boolean {
    return AUTH_ERROR_CODES.includes(status);
  }

  async validateConnection(serverId: string): Promise<{ tools: ToolInfo[] } | null> {
    if (this.isServerSide()) return null;

    const connection = this.get(serverId);
    if (!connection?.sessionId) return null;

    try {
      const response = await fetch(`/api/mcp/tool/list?sessionId=${connection.sessionId}`);

      if (!response.ok) {
        if (this.isAuthError(response.status)) {
          this.remove(serverId);
        }
        return null;
      }

      const data = await response.json();
      return { tools: data.tools || [] };
    } catch (error) {
      console.warn('[ConnectionStore] Validation error:', serverId, error);
      return null;
    }
  }

  async getValidConnections(filterFn?: (serverId: string) => boolean): Promise<Map<string, { tools: ToolInfo[] }>> {
    const connections = this.getAll();
    const validServersData = new Map<string, { tools: ToolInfo[] }>();

    const serverIdsToValidate = Object.keys(connections).filter(serverId =>
      !filterFn || filterFn(serverId)
    );

    const validationPromises = serverIdsToValidate.map(async (serverId) => {
      const data = await this.validateConnection(serverId);
      if (data) {
        validServersData.set(serverId, data);
      }
    });

    await Promise.all(validationPromises);
    return validServersData;
  }
}

export const connectionStore = new ConnectionStore();
