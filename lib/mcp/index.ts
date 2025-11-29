/**
 * MCP (Model Context Protocol) OAuth Client Library
 *
 * This module provides a complete implementation for connecting to MCP servers
 * with OAuth 2.0 authentication, based on the Smithery approach.
 *
 * Usage Example:
 * ```typescript
 * import { sessionStore } from '@/lib/mcp';
 *
 * // In your API route
 * const sessionId = sessionStore.generateSessionId();
 * const client = new MCPOAuthClient(serverUrl, callbackUrl, onRedirect);
 * await client.connect();
 * await sessionStore.setClient(sessionId, client);
 * ```
 */

export { SessionStore, sessionStore } from './session-store';
export { InMemoryOAuthClientProvider } from './oauth-provider';
export { MCPOAuthClient, UnauthorizedError } from './oauth-client';

// Re-export types from MCP SDK for convenience
export type {
  OAuthClientMetadata,
  OAuthClientInformation,
  OAuthClientInformationFull,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';

export type {
  ListToolsResult,
  CallToolResult,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
