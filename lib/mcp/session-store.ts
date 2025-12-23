import { MCPOAuthClient } from './oauth-client';
import { Redis } from 'ioredis';
import type {
  OAuthTokens,
  OAuthClientInformationMixed,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { customAlphabet } from 'nanoid';
import { redis } from './redis';

export interface SessionData {
  sessionId: string;
  serverUrl: string;
  callbackUrl: string;
  transportType: 'sse' | 'streamable_http';
  createdAt: number;
  active: boolean;
  tokens?: OAuthTokens;
  tokenExpiresAt?: number; // Track when the token expires (timestamp in ms)
  clientInformation?: OAuthClientInformationMixed;
  codeVerifier?: string;
  userId?: string;
}

const nanoid = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  24
);

export class SessionStore {
  // private redis: Redis;
  private readonly SESSION_TTL = 43200; // 12 hours
  private readonly KEY_PREFIX = 'mcp:session:';
  private readonly USER_PREFIX = 'mcp:user:';

  constructor(private redis: Redis) {
  
  }

  private getSessionKey(sessionId: string): string {
    return `${this.KEY_PREFIX}${sessionId}`;
  }

  private getUserKey(userId: string): string {
    return `${this.USER_PREFIX}${userId}:sessions`;
  }

  generateSessionId(): string {
    return nanoid();
  }

  async setClient(
    sessionId: string,
    client?: MCPOAuthClient,
    serverUrl?: string,
    callbackUrl?: string,
    transportType: 'sse' | 'streamable_http' = 'streamable_http',
    userId?: string
  ): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);

      let tokens: OAuthTokens | undefined;
      let clientInformation: OAuthClientInformationMixed | undefined;
      let codeVerifier: string | undefined;
      let resolvedServerUrl = serverUrl;
      let resolvedCallbackUrl = callbackUrl;

      if (client) {
        try {
          const oauthProvider = client.oauthProvider;
          if (oauthProvider) {
            tokens = oauthProvider.tokens();
            clientInformation = oauthProvider.clientInformation();
            try {
              codeVerifier = oauthProvider.codeVerifier();
            } catch { }
          }
        } catch { }

        resolvedServerUrl ||= client.getServerUrl();
        resolvedCallbackUrl ||= client.getCallbackUrl();
      }

      if (!resolvedServerUrl || !resolvedCallbackUrl) {
        throw new Error(
          'serverUrl and callbackUrl must be provided (either explicitly or via client)'
        );
      }

      // Calculate token expiration if tokens are provided
      let tokenExpiresAt: number | undefined;
      if (tokens && tokens.expires_in) {
        const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
        tokenExpiresAt = Date.now() + (tokens.expires_in * 1000) - bufferMs;
      }

      const sessionData: SessionData = {
        sessionId,
        serverUrl: resolvedServerUrl,
        callbackUrl: resolvedCallbackUrl,
        transportType,
        createdAt: Date.now(),
        active: true,
        tokens,
        tokenExpiresAt,
        clientInformation,
        codeVerifier,
        userId,
      };

      await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));

      if (userId) {
        const userKey = this.getUserKey(userId);
        await this.redis.sadd(userKey, sessionId);
      }

      console.log(`✅ Redis SET session data: ${sessionKey} (TTL: ${this.SESSION_TTL}s)`);
    } catch (error) {
      console.error('❌ Failed to store session in Redis:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionDataStr = await this.redis.get(sessionKey);
      if (!sessionDataStr) {
        console.log(`❓ Session not found in Redis: ${sessionKey}`);
        return null;
      }

      const sessionData: SessionData = JSON.parse(sessionDataStr);
      await this.redis.expire(sessionKey, this.SESSION_TTL);
      return sessionData;
    } catch (error) {
      console.error('❌ Failed to get session from Redis:', error);
      return null;
    }
  }

  async getClient(sessionId: string): Promise<MCPOAuthClient | null> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) return null;

    // Create client with same parameters
    const client = new MCPOAuthClient({
      serverUrl: sessionData.serverUrl,
      callbackUrl: sessionData.callbackUrl,
      onRedirect: () => { },
      sessionId: sessionData.sessionId,
      transportType: sessionData.transportType,
      tokens: sessionData.tokens,
      tokenExpiresAt: sessionData.tokenExpiresAt,
      clientInformation: sessionData.clientInformation as any,
      onSaveTokens: (tokens: OAuthTokens) => {
        console.log(`✅ [onSaveTokens] onSaveTokens ${JSON.stringify(tokens)}`);
        this.updateTokens(sessionData.sessionId, tokens).catch(err => {
          console.error(`❌ [onSaveTokens] Failed to update tokens in Redis for session ${sessionData.sessionId}:`, err);
        });
      }
    });

    // If no tokens, this is a mid-OAuth flow session
    if (!sessionData.tokens) {
      console.log(`⚠️ Session has no tokens (mid-OAuth flow): ${sessionData.sessionId}`);

      // Connect to initialize OAuth provider
      await client.connect().catch((err) => {
        console.log(
          `🔐 Client awaiting OAuth (expected mid-flow): ${err instanceof Error ? err.message : String(err)}`
        );
      });

      // Restore client information and code verifier for OAuth flow
      const oauthProvider = client.oauthProvider;
      if (oauthProvider) {
        if (sessionData.clientInformation && 'redirect_uris' in sessionData.clientInformation) {
          oauthProvider.saveClientInformation(sessionData.clientInformation);
          console.log(`✅ Restored client info for mid-OAuth: ${sessionData.clientInformation.client_id}`);
        }
        if (sessionData.codeVerifier) {
          oauthProvider.saveCodeVerifier(sessionData.codeVerifier);
          console.log(`✅ Restored code verifier for mid-OAuth`);
        }
      }

      return client;
    }

    // Session has tokens - restore authenticated session
    console.log(`🔐 Restoring OAuth session: ${sessionData.sessionId}`);

    // Connect to initialize OAuth provider
    try{

      await client.connect();
      const oauthProvider = client.oauthProvider;
      if (!oauthProvider) {
        throw new Error('OAuth provider not initialized');
      }
      // similarly we can add additional signature in MCPOAuthClient class to save the client information and code verifier (for now we are doing this way)
      if (sessionData.clientInformation && 'redirect_uris' in sessionData.clientInformation) {
        oauthProvider.saveClientInformation(sessionData.clientInformation);
      }
      if (sessionData.codeVerifier) {
        oauthProvider.saveCodeVerifier(sessionData.codeVerifier);
      }
      return client;
    }
    catch(err){
      console.error(`❌ Failed to restore OAuth session for ${sessionData.sessionId}:`, err);
      throw err;
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

  /**
   * Update tokens for an existing session
   * Used after token refresh to persist new tokens
   */
  async updateTokens(sessionId: string, tokens: OAuthTokens): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        console.warn(`Cannot update tokens: Session ${sessionId} not found`);
        return;
      }

      // // Calculate token expiration
      let tokenExpiresAt: number | undefined;
      if (tokens.expires_in) {
        // const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
        tokenExpiresAt = Date.now() + (tokens.expires_in * 1000);
      }

      // // Update session data with new tokens
      sessionData.tokens = tokens;
      sessionData.tokenExpiresAt = tokenExpiresAt;

      const sessionKey = this.getSessionKey(sessionId);
      await this.redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));
      console.log(`✅ Updated tokens for session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to update tokens in Redis:', error);
      throw error;
    }
  }

  async removeSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);

      try {
        const sessionDataStr = await this.redis.get(sessionKey);
        if (sessionDataStr) {
          const sessionData: SessionData = JSON.parse(sessionDataStr);
          if (sessionData.userId) {
            const userKey = this.getUserKey(sessionData.userId);
            await this.redis.srem(userKey, sessionId);
          }
        }
      } catch (e) {
        console.error(`Error checking userId during removeSession:`, e);
      }

      await this.redis.del(sessionKey);
      console.log(`✅ Removed session: ${sessionId}`);
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
