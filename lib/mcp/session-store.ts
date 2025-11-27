import { MCPOAuthClient } from './oauth-client';
import { Redis } from 'ioredis';
import type { OAuthTokens, OAuthClientInformationMixed } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * Serializable session data stored in Redis
 */
interface SessionData {
  sessionId: string;
  serverUrl: string;
  callbackUrl: string;
  transportType: 'sse' | 'streamable_http';
  createdAt: number;
  active: boolean;
  // OAuth data (stored as JSON-serializable)
  tokens?: OAuthTokens;
  clientInformation?: OAuthClientInformationMixed;
  codeVerifier?: string;
}

/**
 * Session store for managing MCP client instances
 *
 * Hybrid implementation:
 * - Uses Redis to persist OAuth tokens and client config (production)
 * - Recreates client connections from Redis data on serverless instances
 * - Falls back to in-memory when Redis is unavailable (development)
 * - Client connections are ephemeral (recreated per request in serverless)
 */
export class SessionStore {
  private clients = new Map<string, MCPOAuthClient>();
  private serverToSession = new Map<string, Map<string, string>>(); // sessionId -> (serverUrl -> sessionId)
  private redis: Redis | null = null;
  private useRedis = false;
  private readonly SESSION_TTL = 86400; // 24 hours in seconds
  private readonly KEY_PREFIX = 'mcp:session:';

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis connection for production
   */
  private initRedis(): void {
    const redisUrl = process.env.REDIS_URL || process.env.NEXT_PUBLIC_REDIS_URL;

    if (!redisUrl) {
      console.log('🔄 Session Store: Using in-memory storage (Redis URL not configured)');
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.connect().then(() => {
        this.useRedis = true;
        console.log('✅ Session Store: Connected to Redis');
      }).catch((err) => {
        console.warn('⚠️ Session Store: Redis connection failed, falling back to in-memory:', err.message);
        this.useRedis = false;
        this.redis = null;
      });

      this.redis.on('error', (err) => {
        console.error('❌ Session Store: Redis error:', err.message);
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Session Store: Reconnecting to Redis...');
      });

    } catch (error) {
      console.warn('⚠️ Session Store: Redis initialization failed, using in-memory storage:', error);
      this.redis = null;
      this.useRedis = false;
    }
  }

  /**
   * Store a client instance with a session ID
   */
  async setClient(
    sessionId: string,
    client: MCPOAuthClient,
    serverUrl?: string,
    callbackUrl?: string,
    transportType?: 'sse' | 'streamable_http'
  ): Promise<void> {
    // Store client in memory (connections cannot be serialized)
    this.clients.set(sessionId, client);

    // Store full session data in Redis for serverless persistence
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;

        // Extract OAuth data from client if available
        let tokens, clientInformation, codeVerifier;
        try {
          const oauthProvider = client.oauthProvider;
          if (oauthProvider) {
            tokens = oauthProvider.tokens();
            clientInformation = oauthProvider.clientInformation();
            try {
              codeVerifier = oauthProvider.codeVerifier();
            } catch {
              // codeVerifier might not be set yet
            }
          }
        } catch (e) {
          // OAuth provider might not be initialized yet
        }

        const sessionData: SessionData = {
          sessionId,
          serverUrl: serverUrl || client.getServerUrl(),
          callbackUrl: callbackUrl || client.getCallbackUrl(),
          transportType: transportType || 'streamable_http',
          createdAt: Date.now(),
          active: true,
          tokens,
          clientInformation,
          codeVerifier,
        };

        await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));
        console.log(`✅ Redis SET client data: ${sessionKey} (TTL: ${this.SESSION_TTL}s)`);
      } catch (error) {
        console.error('❌ Failed to store session in Redis:', error);
      }
    } else {
      console.log(`📦 In-memory SET client: sessionId=${sessionId}`);
    }
  }

  /**
   * Retrieve a client instance by session ID
   * If not in memory, attempts to recreate from Redis (for serverless)
   */
  async getClient(sessionId: string): Promise<MCPOAuthClient | null> {
    // Check in-memory cache first
    let client = this.clients.get(sessionId) || null;

    if (client) {
      console.log(`✅ In-memory GET client: sessionId=${sessionId}`);

      // Verify session still exists in Redis
      if (this.useRedis && this.redis) {
        try {
          const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
          const exists = await this.redis.exists(sessionKey);
          if (!exists) {
            // Session expired in Redis, clean up in-memory client
            console.log(`⚠️ Redis session expired, removing client: ${sessionKey}`);
            this.clients.delete(sessionId);
            return null;
          }
          // Refresh TTL on access
          await this.redis.expire(sessionKey, this.SESSION_TTL);
        } catch (error) {
          console.error('❌ Failed to verify session in Redis:', error);
        }
      }

      return client;
    }

    // Client not in memory - try to recreate from Redis (serverless scenario)
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
        const sessionDataStr = await this.redis.get(sessionKey);

        if (!sessionDataStr) {
          console.log(`❓ Session not found in Redis: ${sessionKey}`);
          return null;
        }

        const sessionData: SessionData = JSON.parse(sessionDataStr);
        console.log(`🔄 Recreating client from Redis: ${sessionKey}`);

        // Recreate the client from stored data
        client = await this.recreateClient(sessionData);

        // Store in memory for subsequent requests in this instance
        this.clients.set(sessionId, client);

        // Refresh TTL
        await this.redis.expire(sessionKey, this.SESSION_TTL);

        console.log(`✅ Client recreated successfully: ${sessionKey}`);
        return client;
      } catch (error) {
        console.error('❌ Failed to recreate client from Redis:', error);
        return null;
      }
    }

    console.log(`❓ Client not found: sessionId=${sessionId}`);
    return null;
  }

  /**
   * Recreate an MCPOAuthClient from stored session data
   * Used to restore client connections in serverless environments
   */
  private async recreateClient(sessionData: SessionData): Promise<MCPOAuthClient> {
    // Create a new client with stored configuration
    const client = new MCPOAuthClient(
      sessionData.serverUrl,
      sessionData.callbackUrl,
      () => {
        // No-op redirect handler for recreated clients
        // Redirect is only needed during initial OAuth flow
      },
      sessionData.sessionId,
      sessionData.transportType
    );

    // If OAuth tokens exist, we need to restore the authenticated state
    if (sessionData.tokens) {
      console.log(`🔐 Restoring OAuth tokens for session: ${sessionData.sessionId}`);

      // Connect and restore OAuth state
      await client.connect();

      // Inject the stored OAuth tokens directly into the provider
      const oauthProvider = client.oauthProvider;
      if (oauthProvider) {
        if (sessionData.tokens) {
          oauthProvider.saveTokens(sessionData.tokens);
        }
        if (sessionData.clientInformation && 'redirect_uris' in sessionData.clientInformation) {
          // Only save if it's the full client information (with redirect_uris)
          oauthProvider.saveClientInformation(sessionData.clientInformation);
        }
        if (sessionData.codeVerifier) {
          oauthProvider.saveCodeVerifier(sessionData.codeVerifier);
        }
      }

      console.log(`✅ OAuth state restored for session: ${sessionData.sessionId}`);
    } else {
      // No OAuth tokens - connect normally (might require auth)
      await client.connect();
    }

    return client;
  }

  /**
   * Remove a client from the store and disconnect it
   */
  async removeClient(sessionId: string): Promise<void> {
    const client = this.clients.get(sessionId);
    if (client) {
      client.disconnect();
      this.clients.delete(sessionId);
    }

    // Remove from Redis
    if (this.useRedis && this.redis) {
      try {
        const sessionKey = `${this.KEY_PREFIX}${sessionId}`;
        await this.redis.del(sessionKey);

        // Remove all server URL mappings for this session
        const pattern = `${this.KEY_PREFIX}session:${sessionId}:url:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('❌ Failed to remove session from Redis:', error);
      }
    }

    // Also remove from in-memory server mapping (iterate through nested map)
    for (const [userId, serverMap] of this.serverToSession.entries()) {
      for (const [serverName, sid] of serverMap.entries()) {
        if (sid === sessionId) {
          serverMap.delete(serverName);
          if (serverMap.size === 0) {
            this.serverToSession.delete(userId);
          }
          break;
        }
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
  async getAllSessionIds(): Promise<string[]> {
    if (this.useRedis && this.redis) {
      try {
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        return keys.map(key => key.replace(this.KEY_PREFIX, ''));
      } catch (error) {
        console.error('❌ Failed to get sessions from Redis:', error);
      }
    }
    return Array.from(this.clients.keys());
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    // Disconnect all in-memory clients
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
    this.serverToSession.clear();

    // Clear Redis
    if (this.useRedis && this.redis) {
      try {
        const pattern = `${this.KEY_PREFIX}*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.error('❌ Failed to clear sessions from Redis:', error);
      }
    }
  }

  /**
   * Map a server URL to a session ID for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   * @param sessionIdValue - OAuth session ID to store (same as sessionId param)
   */
  async setServerSession(sessionId: string, serverUrl: string, sessionIdValue: string): Promise<void> {
    // Store in nested map: sessionId -> (serverUrl -> sessionId)
    if (!this.serverToSession.has(sessionId)) {
      this.serverToSession.set(sessionId, new Map());
    }
    this.serverToSession.get(sessionId)!.set(serverUrl, sessionIdValue);

    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        await this.redis.setex(serverKey, this.SESSION_TTL, sessionIdValue);
        console.log(`✅ Redis SET: ${serverKey} -> ${sessionIdValue} (TTL: ${this.SESSION_TTL}s)`);
      } catch (error) {
        console.error('❌ Failed to store server mapping in Redis:', error);
      }
    } else {
      console.log('📦 In-memory SET: sessionId=' + sessionId + ', serverUrl=' + serverUrl);
    }
  }

  /**
   * Get session ID for a server URL for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async getServerSession(sessionId: string, serverUrl: string): Promise<string | null> {
    // Try in-memory cache first
    let storedSessionId = this.serverToSession.get(sessionId)?.get(serverUrl) || null;

    if (storedSessionId) {
      console.log(`✅ In-memory GET: ${sessionId} + ${serverUrl} -> ${storedSessionId}`);
      return storedSessionId;
    }

    // If not in cache, try Redis
    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        storedSessionId = await this.redis.get(serverKey);
        if (storedSessionId) {
          console.log(`✅ Redis GET: ${serverKey} -> ${storedSessionId}`);
          // Update in-memory cache
          if (!this.serverToSession.has(sessionId)) {
            this.serverToSession.set(sessionId, new Map());
          }
          this.serverToSession.get(sessionId)!.set(serverUrl, storedSessionId);
          // Refresh TTL
          await this.redis.expire(serverKey, this.SESSION_TTL);
        } else {
          console.log(`❓ Redis GET: ${serverKey} -> NOT FOUND`);
        }
      } catch (error) {
        console.error('❌ Failed to get server mapping from Redis:', error);
      }
    } else {
      console.log(`❓ Not found: sessionId=${sessionId}, serverUrl=${serverUrl}`);
    }

    return storedSessionId;
  }

  /**
   * Remove server session mapping for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async removeServerSession(sessionId: string, serverUrl: string): Promise<void> {
    const storedSessionId = await this.getServerSession(sessionId, serverUrl);
    if (storedSessionId) {
      await this.removeClient(storedSessionId);
    }

    // Remove from in-memory cache
    this.serverToSession.get(sessionId)?.delete(serverUrl);
    if (this.serverToSession.get(sessionId)?.size === 0) {
      this.serverToSession.delete(sessionId);
    }

    if (this.useRedis && this.redis) {
      try {
        const serverKey = `${this.KEY_PREFIX}session:${sessionId}:url:${serverUrl}`;
        await this.redis.del(serverKey);
      } catch (error) {
        console.error('❌ Failed to remove server mapping from Redis:', error);
      }
    }
  }

  /**
   * Get client by server URL for a specific session
   * @param sessionId - OAuth session ID for the connection
   * @param serverUrl - MCP server URL (unique identifier)
   */
  async getClientByServer(sessionId: string, serverUrl: string): Promise<MCPOAuthClient | null> {
    const storedSessionId = await this.getServerSession(sessionId, serverUrl);
    return storedSessionId ? this.getClient(storedSessionId) : null;
  }

  /**
   * Cleanup expired sessions (should be called periodically)
   */
  async cleanupExpiredSessions(): Promise<void> {
    if (!this.useRedis || !this.redis) return;

    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Get Redis connection status
   */
  isRedisConnected(): boolean {
    return this.useRedis && this.redis?.status === 'ready';
  }

  /**
   * Close Redis connection gracefully
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        console.log('✅ Session Store: Redis disconnected');
      } catch (error) {
        console.error('❌ Failed to disconnect Redis:', error);
      }
    }
  }
}

// Global singleton instance
export const sessionStore = new SessionStore();
