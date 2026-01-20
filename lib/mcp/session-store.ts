import type { MCPClient } from './oauth-client';
import { Redis } from 'ioredis';
import type {
  OAuthTokens,
  OAuthClientInformationMixed,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { customAlphabet } from 'nanoid';
import { redis } from './redis';

export interface SessionData {
  sessionId: string;
  serverId?: string; // Database server ID for mapping
  serverName?: string;
  serverUrl: string;
  callbackUrl: string;
  transportType: 'sse' | 'streamable_http';
  createdAt: number;
  active: boolean;
  userId?: string;
  headers?: Record<string, string>;
  // OAuth data (consolidated)
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  clientId?: string;
}

export interface SetClientOptions {
  sessionId: string;
  serverId?: string; // Database server ID
  serverName?: string; // Human-readable server name
  client?: MCPClient;
  serverUrl?: string;
  callbackUrl?: string;
  transportType?: 'sse' | 'streamable_http';
  userId?: string;
  headers?: Record<string, string>;
  active?: boolean;
}

// first char: letters only (required by OpenAI)
const firstChar = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  1
);

// remaining chars: alphanumeric
const rest = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  11
);

export class SessionStore {
  private readonly SESSION_TTL = 43200; // 12 hours
  private readonly KEY_PREFIX = 'mcp:server:';

  constructor(private redis: Redis) {

  }

  private getSessionKey(userId: string, serverId: string): string {
    return `${this.KEY_PREFIX}${userId}:${serverId}`;
  }

  private getUserKey(userId: string): string {
    return `mcp:user:${userId}:servers`;
  }

  generateSessionId(): string {
    // must start with letter for (OpenAI compatibility)
    return firstChar() + rest();
  }

  async setClient(options: SetClientOptions): Promise<void> {
    const {
      sessionId,
      serverId,
      serverName,
      serverUrl,
      callbackUrl,
      transportType = 'streamable_http',
      userId,
      headers,
      active = false
    } = options;

    try {
      if (!serverUrl || !callbackUrl) {
        throw new Error('serverUrl and callbackUrl must be provided');
      }

      if (!userId || !serverId) {
        throw new Error('userId and serverId are required for session storage');
      }

      const sessionKey = this.getSessionKey(userId, serverId);

      // Load existing data to preserve OAuth tokens
      const existingDataStr = await this.redis.get(sessionKey);
      const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};

      const sessionData: SessionData = {
        ...existingData, // Preserve existing data (including OAuth tokens)
        sessionId,
        serverId,
        serverName,
        serverUrl,
        callbackUrl,
        transportType,
        createdAt: existingData.createdAt || Date.now(), // Keep original creation time
        active,
        userId,
        headers,
      };

      await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));

      // Track server IDs for this user
      const userKey = this.getUserKey(userId);
      await this.redis.sadd(userKey, serverId);

      console.log(`✅ Redis SET: ${sessionKey} (TTL: ${this.SESSION_TTL}s)`);
    } catch (error) {
      console.error('❌ Failed to store session in Redis:', error);
      throw error;
    }
  }

  async getSession(userId: string, serverId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(userId, serverId);
      const sessionDataStr = await this.redis.get(sessionKey);
      if (!sessionDataStr) {
        console.log(`❓ Session not found: ${sessionKey}`);
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      await this.redis.expire(sessionKey, this.SESSION_TTL);
      return sessionData;
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  }

  async getUserMcpSessions(userId: string): Promise<string[]> {
    const userKey = this.getUserKey(userId);
    try {
      const sessionIds = await this.redis.smembers(userKey);
      return sessionIds;
    } catch (error) {
      console.error(`❌ Failed to get user sessions from Redis for user ${userId}:`, error);
      return [];
    }
  }

  async getUserSessionsData(userId: string): Promise<SessionData[]> {
    const userKey = this.getUserKey(userId);

    try {
      const serverIds = await this.redis.smembers(userKey);
      if (serverIds.length === 0) return [];

      const validSessions: SessionData[] = [];

      const results = await Promise.all(
        serverIds.map(async (serverId) => {
          const sessionKey = this.getSessionKey(userId, serverId);
          const data = await this.redis.get(sessionKey);

          if (!data) {
            return null;
          }

          return JSON.parse(data) as SessionData;
        })
      );

      for (const sessionData of results) {
        if (sessionData) {
          validSessions.push(sessionData);
        }
      }

      return validSessions;
    } catch (error) {
      console.error(`❌ Failed to get user sessions for ${userId}:`, error);
      return [];
    }
  }

  async removeSession(userId: string, serverId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(userId, serverId);

      // Remove server tracking for user
      const userKey = this.getUserKey(userId);
      await this.redis.srem(userKey, serverId);

      await this.redis.del(sessionKey);
      console.log(`✅ Removed session: ${sessionKey}`);
    } catch (error) {
      console.error('❌ Failed to remove session from Redis:', error);
    }
  }

  async getAllSessionIds(): Promise<string[]> {
    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      return keys.map((key) => key.replace(this.KEY_PREFIX, ''));
    } catch (error) {
      console.error('❌ Failed to get sessions from Redis:', error);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    try {
      const pattern = `${this.KEY_PREFIX}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      console.log('✅ Cleared all sessions from Redis');
    } catch (error) {
      console.error('❌ Failed to clear sessions from Redis:', error);
    }
  }

  async cleanupExpiredSessions(): Promise<void> {
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

  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
      console.log('✅ Session Store: Redis disconnected');
    } catch (error) {
      console.error('❌ Failed to disconnect Redis:', error);
    }
  }
}

export const sessionStore = new SessionStore(redis);
