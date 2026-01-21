# MCP Redis OAuth Client

Complete Redis-backed implementation of an MCP (Model Context Protocol) client with OAuth 2.0 authentication and stateless session management. Designed for serverless/stateless environments like Next.js API Routes.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Classes](#core-classes)
  - [MCPClient](#mcpclient)
  - [SessionStore](#sessionstore)
  - [RedisOAuthClientProvider](#redisoauthclientprovider)
- [Utility Functions](#utility-functions)
- [Usage Examples](#usage-examples)

---

## Architecture Overview

The library consists of three main components that work together:

### 1. Session Management (`session-store.ts`)
Manages MCP connection metadata and OAuth state in Redis. Sessions are keyed by `userId:sessionId` and have a 12-hour TTL.

### 2. OAuth Provider (`redis-oauth-client-provider.ts`)
Implements the MCP SDK's `AgentsOAuthProvider` interface, storing OAuth tokens, client information, and PKCE verifiers in Redis alongside session data.

### 3. MCP Client (`oauth-client.ts`)
Primary interface for MCP interactions. Can restore full state from Redis using just `userId` and `sessionId`.

---

## Core Classes

## MCPClient

The main class for interacting with MCP servers. Handles OAuth authentication, token refresh, and tool execution.

### Constructor

```typescript
new MCPClient(options: MCPOAuthClientOptions)
```

**Options:**
- `userId` (required): User identifier
- `sessionId` (required): Session identifier for this connection
- `serverId` (optional): Server identifier from database
- `serverUrl` (optional): MCP server URL (loaded from Redis if not provided)
- `serverName` (optional): Human-readable server name
- `callbackUrl` (optional): OAuth callback URL (loaded from Redis if not provided)
- `transportType` (optional): `'sse'` or `'streamable_http'` (default: `'streamable_http'`)
- `onRedirect` (optional): Callback function when OAuth redirect is needed
- `headers` (optional): Additional HTTP headers

**Example:**
```typescript
// Minimal - loads everything from Redis
const client = new MCPClient({
  userId: 'user-123',
  sessionId: 'session-abc',
});

// Full options for initial connection
const client = new MCPClient({
  userId: 'user-123',
  sessionId: 'session-abc',
  serverUrl: 'https://mcp.example.com',
  callbackUrl: 'http://localhost:3000/api/mcp/auth/callback',
  transportType: 'streamable_http',
  onRedirect: (url) => console.log('Redirect to:', url),
});
```

### Core Methods

#### `connect()`
Establishes connection to the MCP server. Automatically handles token validation and refresh.

```typescript
await client.connect(): Promise<void>
```

**Throws:**
- `UnauthorizedError` - OAuth authorization required
- `Error` - Connection failed

**Example:**
```typescript
try {
  await client.connect();
  console.log('Connected successfully');
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Redirect user to OAuth flow
    console.log('Authorization required');
  } else {
    console.error('Connection failed:', error);
  }
}
```

#### `finishAuth(authCode)`
Completes OAuth flow by exchanging authorization code for tokens.

```typescript
await client.finishAuth(authCode: string): Promise<void>
```

**Parameters:**
- `authCode`: Authorization code from OAuth callback

**Example:**
```typescript
// In your OAuth callback handler
const { code } = req.query;
await client.finishAuth(code);
// Client is now authenticated and connected
```

#### `listTools()`
Retrieves all available tools from the connected MCP server.

```typescript
await client.listTools(): Promise<ListToolsResult>
```

**Returns:** Object containing array of tools with their schemas

**Example:**
```typescript
const { tools } = await client.listTools();
tools.forEach(tool => {
  console.log(`${tool.name}: ${tool.description}`);
});
```

#### `callTool(toolName, toolArgs)`
Executes a tool on the MCP server.

```typescript
await client.callTool(
  toolName: string,
  toolArgs: Record<string, unknown>
): Promise<CallToolResult>
```

**Parameters:**
- `toolName`: Name of the tool to execute
- `toolArgs`: Arguments to pass to the tool

**Returns:** Tool execution result

**Example:**
```typescript
const result = await client.callTool('search_files', {
  query: 'example.ts',
  path: '/src'
});
console.log(result.content);
```

#### `getAdditionalData()`
Fetches comprehensive server metadata including capabilities, prompts, resources, and tools.

```typescript
await client.getAdditionalData(): Promise<{
  serverVersion?: any;
  serverCapabilities?: any;
  instructions?: string;
  prompts?: any[];
  resources?: any[];
  resourceTemplates?: any[];
  tools?: any[];
}>
```

**Example:**
```typescript
const data = await client.getAdditionalData();
console.log('Server version:', data.serverVersion);
console.log('Available prompts:', data.prompts);
```

### Token Management

#### `refreshToken()`
Manually refresh the access token using the refresh token.

```typescript
await client.refreshToken(): Promise<boolean>
```

**Returns:** `true` if refresh successful, `false` otherwise

#### `getValidTokens()`
Ensures tokens are valid, refreshing if expired.

```typescript
await client.getValidTokens(): Promise<boolean>
```

**Returns:** `true` if valid tokens available, `false` otherwise

**Note:** This is called automatically by `connect()` and doesn't usually need to be called manually.

### Session Management

#### `clearSession()`
Completely removes the session from Redis, including all OAuth data.

```typescript
await client.clearSession(): Promise<void>
```

**Example:**
```typescript
// User wants to disconnect from server
await client.clearSession();
```

#### `reconnect()`
Reconnects using existing OAuth provider (for session restoration in serverless environments).

```typescript
await client.reconnect(): Promise<void>
```

**Example:**
```typescript
// Restore connection from existing session
const client = new MCPClient({ userId, sessionId });
await client.reconnect();
```

### State Accessors

#### `isConnected()`
```typescript
client.isConnected(): boolean
```

#### `getServerUrl()`
```typescript
client.getServerUrl(): string
```

#### `getCallbackUrl()`
```typescript
client.getCallbackUrl(): string
```

#### `getTransportType()`
```typescript
client.getTransportType(): TransportType
```

#### `getServerName()`
```typescript
client.getServerName(): string | undefined
```

#### `getServerId()`
```typescript
client.getServerId(): string | undefined
```

#### `disconnect()`
Closes the connection and cleans up resources (does not remove from Redis).

```typescript
client.disconnect(): void
```

### Static Methods

#### `getMcpServerConfig(userId)`
Gets configuration for all user's active MCP sessions. Automatically refreshes expired tokens.

```typescript
await MCPClient.getMcpServerConfig(userId: string): Promise<Record<string, any>>
```

**Returns:** Object keyed by sanitized server labels, each containing:
- `transport`: Transport type
- `url`: Server URL
- `serverName`: Human-readable name
- `serverLabel`: Sanitized label
- `headers`: OAuth headers with valid access token

**Example:**
```typescript
const config = await MCPClient.getMcpServerConfig('user-123');
// {
//   apify: {
//     transport: 'streamable_http',
//     url: 'https://mcp.apify.com',
//     serverName: 'Apify',
//     serverLabel: 'apify',
//     headers: { Authorization: 'Bearer ...' }
//   }
// }
```

---

## SessionStore

Manages MCP session data in Redis with automatic TTL management.

### Methods

#### `generateSessionId()`
Generates a unique session ID that starts with a letter (OpenAI compatible).

```typescript
sessionStore.generateSessionId(): string
```

#### `setClient(options)`
Stores or updates a session in Redis.

```typescript
await sessionStore.setClient(options: SetClientOptions): Promise<void>
```

**Options:**
- `sessionId` (required)
- `userId` (required)
- `serverId` (required)
- `serverUrl` (required)
- `callbackUrl` (required)
- `serverName` (optional)
- `transportType` (optional, default: 'streamable_http')
- `headers` (optional)
- `active` (optional, default: false)

**Example:**
```typescript
await sessionStore.setClient({
  sessionId: 'abc123',
  userId: 'user-123',
  serverId: 'server-xyz',
  serverUrl: 'https://mcp.example.com',
  callbackUrl: 'http://localhost:3000/callback',
  transportType: 'streamable_http',
  active: true,
});
```

#### `getSession(userId, sessionId)`
Retrieves a session from Redis and refreshes its TTL.

```typescript
await sessionStore.getSession(
  userId: string,
  sessionId: string
): Promise<SessionData | null>
```

#### `getUserMcpSessions(userId)`
Gets all session IDs for a user.

```typescript
await sessionStore.getUserMcpSessions(userId: string): Promise<string[]>
```

#### `getUserSessionsData(userId)`
Gets full session data for all user's sessions.

```typescript
await sessionStore.getUserSessionsData(userId: string): Promise<SessionData[]>
```

#### `removeSession(userId, sessionId)`
Removes a session from Redis.

```typescript
await sessionStore.removeSession(userId: string, sessionId: string): Promise<void>
```

#### `clearAll()`
Removes all sessions from Redis (use with caution).

```typescript
await sessionStore.clearAll(): Promise<void>
```

#### `cleanupExpiredSessions()`
Manually removes expired sessions.

```typescript
await sessionStore.cleanupExpiredSessions(): Promise<void>
```

---

## RedisOAuthClientProvider

Implements OAuth provider interface with Redis backing. Usually used internally by MCPClient.

### Key Methods

#### `clientInformation()`
Retrieves stored OAuth client information.

```typescript
await provider.clientInformation(): Promise<OAuthClientInformation | undefined>
```

#### `saveClientInformation(clientInfo)`
Stores OAuth client information in Redis.

```typescript
await provider.saveClientInformation(
  clientInfo: OAuthClientInformationFull
): Promise<void>
```

#### `tokens()`
Retrieves stored OAuth tokens.

```typescript
await provider.tokens(): Promise<OAuthTokens | undefined>
```

#### `saveTokens(tokens)`
Stores OAuth tokens with expiration calculation.

```typescript
await provider.saveTokens(tokens: OAuthTokens): Promise<void>
```

#### `isTokenExpired()`
Checks if the current access token is expired.

```typescript
provider.isTokenExpired(): boolean
```

#### `saveCodeVerifier(verifier)`
Stores PKCE code verifier for OAuth flow.

```typescript
await provider.saveCodeVerifier(verifier: string): Promise<void>
```

#### `codeVerifier()`
Retrieves stored code verifier.

```typescript
await provider.codeVerifier(): Promise<string>
```

---

## Utility Functions

### `sanitizeServerLabel(name)`
Converts server name to valid label (starts with letter, contains only alphanumeric, `-`, `_`).

```typescript
import { sanitizeServerLabel } from '@/lib/mcp';

const label = sanitizeServerLabel('My Server Name!');
// Returns: 'my_server_name'
```

---

## Usage Examples

### Complete OAuth Flow

```typescript
import { MCPClient, sessionStore, UnauthorizedError } from '@/lib/mcp';

// 1. Initial connection attempt
const sessionId = sessionStore.generateSessionId();
const client = new MCPClient({
  userId: 'user-123',
  sessionId,
  serverUrl: 'https://mcp.example.com',
  callbackUrl: 'http://localhost:3000/api/mcp/auth/callback',
  onRedirect: (authUrl) => {
    // Redirect user to OAuth authorization
    window.location.href = authUrl;
  },
});

try {
  await client.connect();
  // Success - no OAuth needed
  const tools = await client.listTools();
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // OAuth redirect triggered via onRedirect callback
    console.log('Redirecting to OAuth...');
  }
}

// 2. OAuth callback handler
async function handleOAuthCallback(code: string, state: string) {
  const sessionId = state; // sessionId passed in OAuth state
  const client = new MCPClient({
    userId: 'user-123',
    sessionId,
  });

  await client.finishAuth(code);
  // Connection established, tokens saved
}

// 3. Subsequent requests (serverless environment)
async function makeToolCall() {
  const client = new MCPClient({
    userId: 'user-123',
    sessionId: 'existing-session-id',
  });

  // Auto-loads from Redis and validates tokens
  await client.connect();

  const result = await client.callTool('my_tool', { arg: 'value' });
  return result;
}
```

### Getting User's MCP Configuration

```typescript
import { MCPClient } from '@/lib/mcp';

// Get all active MCP servers for a user with valid tokens
const mcpConfig = await MCPClient.getMcpServerConfig('user-123');

// Use in agent configuration
const agent = createAgent({
  mcpServers: Object.entries(mcpConfig).map(([label, config]) => ({
    serverLabel: label,
    serverUrl: config.url,
    headers: config.headers, // Includes fresh OAuth token
  })),
});
```

### Session Cleanup

```typescript
// Remove specific session
await client.clearSession();

// Or via session store
await sessionStore.removeSession('user-123', 'session-abc');

// Clean up all expired sessions
await sessionStore.cleanupExpiredSessions();
```

---

## Key Features

- **Stateless Re-hydration**: Full state restoration from Redis using only `userId` + `sessionId`
- **Automatic Token Refresh**: Tokens refreshed transparently before expiration
- **Serverless-Friendly**: Works in serverless environments (Vercel, AWS Lambda, etc.)
- **Type-Safe**: Full TypeScript support with exported types
- **Flexible Transport**: Supports both SSE and Streamable HTTP
- **Session Expiration**: Automatic 12-hour TTL with refresh on access

## Error Handling

```typescript
import { UnauthorizedError } from '@/lib/mcp';

try {
  await client.connect();
} catch (error) {
  if (error instanceof UnauthorizedError) {
    // Handle OAuth authorization requirement
  } else if (error.message === 'Session not found') {
    // Session expired or doesn't exist
  } else {
    // Other connection errors
  }
}
```

---

## Attribution

This library was developed with assistance from Claude (Anthropic's AI assistant). The architecture, implementation, and documentation were created through an iterative process of requirements gathering, code generation, review, and refinement. Most of the code has been thoroughly tested and validated for production use in serverless environments.
