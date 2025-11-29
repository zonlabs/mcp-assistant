# MCP OAuth Client Implementation

This directory contains a complete implementation of MCP (Model Context Protocol) client with OAuth 2.0 authentication, based on the [Smithery TypeScript OAuth Client](https://smithery.ai/docs/cookbooks/typescript_oauth_client) approach.

## Architecture

The implementation consists of three main components:

### 1. Session Management (`session-store.ts`)

Manages MCP client instances with unique session IDs using a hybrid storage approach:

```typescript
import { sessionStore } from '@/lib/mcp';

const sessionId = sessionStore.generateSessionId();
await sessionStore.setClient(sessionId, client);
const client = await sessionStore.getClient(sessionId);
await sessionStore.removeClient(sessionId); // Disconnects and removes

// Check Redis connection status
const isRedisActive = sessionStore.isRedisConnected();
```

**Storage Strategy:**
- **Production (with Redis)**: Sessions persist with 24-hour TTL, survive server restarts
- **Development (no Redis)**: Falls back to in-memory storage, cleared on restart
- Client connections always stay in memory (cannot be serialized)
- Redis stores session metadata: sessionId, timestamps, server mappings

**Environment Variable:**
```bash
REDIS_URL=redis://localhost:6379/1  # Optional - auto-falls back to in-memory
```

### 2. OAuth Provider (`oauth-provider.ts`)

Implements the `OAuthClientProvider` interface from MCP SDK:

- Stores OAuth tokens, client information, and code verifier
- Handles authorization redirects
- Manages PKCE flow for OAuth 2.0

### 3. MCP OAuth Client (`oauth-client.ts`)

Main client class for MCP server interactions:

```typescript
import { MCPOAuthClient } from '@/lib/mcp';

const client = new MCPOAuthClient(
  serverUrl,
  callbackUrl,
  (authUrl) => {
    // Handle OAuth redirect
    console.log('Please authorize at:', authUrl);
  }
);

await client.connect();
const tools = await client.listTools();
const result = await client.callTool('tool_name', { arg: 'value' });
client.disconnect();
```

## API Routes

The implementation provides five API endpoints:

### 1. Connect to MCP Server

**POST** `/api/mcp/auth/connect`

Initiates connection to an MCP server. If OAuth is required, returns an authorization URL.

```typescript
// Request
{
  "serverUrl": "https://server.example.com/mcp",
  "callbackUrl": "http://localhost:3000/api/mcp/auth/callback"
}

// Response (no auth required)
{
  "success": true,
  "sessionId": "abc123xyz"
}

// Response (auth required)
{
  "requiresAuth": true,
  "authUrl": "https://server.example.com/oauth/authorize?...",
  "sessionId": "abc123xyz"
}
```

### 2. OAuth Callback

**GET/POST** `/api/mcp/auth/callback?code=...&sessionId=...`

Receives OAuth authorization code and completes authentication.

```typescript
// Response
{
  "success": true,
  "message": "Authorization completed"
}
```

### 3. Disconnect from Server

**POST** `/api/mcp/auth/disconnect`

Cleanly disconnects from the MCP server and removes the session.

```typescript
// Request
{
  "sessionId": "abc123xyz"
}

// Response
{
  "success": true,
  "message": "Disconnected successfully"
}
```

### 4. List Available Tools

**GET** `/api/mcp/tool/list?sessionId=abc123xyz`

Retrieves all tools available from the connected MCP server.

```typescript
// Response
{
  "tools": [
    {
      "name": "example_tool",
      "description": "An example tool",
      "inputSchema": {
        "type": "object",
        "properties": { ... }
      }
    }
  ]
}
```

### 5. Call a Tool

**POST** `/api/mcp/tool/call`

Executes a tool on the MCP server with provided arguments.

```typescript
// Request
{
  "sessionId": "abc123xyz",
  "toolName": "example_tool",
  "toolArgs": {
    "param1": "value1",
    "param2": "value2"
  }
}

// Response
{
  "content": [
    {
      "type": "text",
      "text": "Tool execution result"
    }
  ],
  "isError": false
}
```

## Usage Example

### Frontend Integration

```typescript
import {
  ConnectResponse,
  isConnectSuccess,
  isConnectAuthRequired,
} from '@/lib/mcp/types';

// Step 1: Connect to server
const connectResponse = await fetch('/api/mcp/auth/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serverUrl: 'https://server.example.com/mcp',
    callbackUrl: 'http://localhost:3000/api/mcp/auth/callback',
  }),
});

const data: ConnectResponse = await connectResponse.json();

if (isConnectSuccess(data)) {
  // Connection successful without OAuth
  const sessionId = data.sessionId;
  console.log('Connected:', sessionId);
} else if (isConnectAuthRequired(data)) {
  // OAuth required - open authorization URL
  const { authUrl, sessionId } = data;
  window.open(authUrl, '_blank'); // Open in popup
  // After user authorizes, callback endpoint will be called automatically
}

// Step 2: List tools
const toolsResponse = await fetch(
  `/api/mcp/tool/list?sessionId=${sessionId}`
);
const { tools } = await toolsResponse.json();

// Step 3: Call a tool
const callResponse = await fetch('/api/mcp/tool/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionId,
    toolName: 'example_tool',
    toolArgs: { param: 'value' },
  }),
});
const result = await callResponse.json();

// Step 4: Disconnect when done
await fetch('/api/mcp/auth/disconnect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId }),
});
```

## Type Safety

All API types are defined in `types.ts` with type guards for runtime type checking:

```typescript
import {
  ConnectResponse,
  isConnectSuccess,
  isConnectAuthRequired,
  isConnectError,
} from '@/lib/mcp/types';

const response: ConnectResponse = await fetch(...).then(r => r.json());

if (isConnectSuccess(response)) {
  // TypeScript knows response is ConnectSuccessResponse
  console.log(response.sessionId);
} else if (isConnectAuthRequired(response)) {
  // TypeScript knows response is ConnectAuthRequiredResponse
  console.log(response.authUrl, response.sessionId);
} else if (isConnectError(response)) {
  // TypeScript knows response is ConnectErrorResponse
  console.error(response.error);
}
```

## Key Differences from GraphQL Approach

This implementation replaces the GraphQL-based MCP connection management with direct HTTP API calls:

| Feature | GraphQL Approach | Smithery Approach |
|---------|-----------------|-------------------|
| Connection | `connectMcpServer` mutation | `POST /api/mcp/auth/connect` |
| Disconnection | `disconnectMcpServer` mutation | `POST /api/mcp/auth/disconnect` |
| List Tools | Via GraphQL query | `GET /api/mcp/tool/list` |
| Call Tool | Via GraphQL mutation | `POST /api/mcp/tool/call` |
| Session Management | Django backend + Redis | In-memory (or Redis for production) |
| Authentication | Custom middleware | OAuth 2.0 with PKCE |

## Production Considerations

1. **Session Storage**: ✅ **Implemented** - Redis-backed session store with automatic fallback
   - Set `REDIS_URL` environment variable to enable Redis persistence
   - Sessions automatically expire after 24 hours (TTL-based)
   - Graceful fallback to in-memory when Redis unavailable
   - Client connections stay in memory, metadata in Redis

2. **OAuth State**: Persist OAuth tokens and client information in a database
   - Currently stored in-memory via `InMemoryOAuthClientProvider`
   - Consider implementing database-backed OAuth provider for multi-server deployments

3. **Error Handling**: Add retry logic and exponential backoff for failed connections
   - Redis reconnection with exponential backoff (50ms to 2s)
   - Connection errors logged with detailed context

4. **Security**:
   - Validate callback URLs to prevent open redirects
   - Implement CSRF protection for OAuth flows
   - Add rate limiting to API endpoints
   - Use separate Redis databases for backend (db 0) and frontend (db 1)

5. **Monitoring**: Add logging and metrics for connection status and tool calls
   - Session store logs connection status: ✅, ⚠️, ❌
   - Track Redis health via `sessionStore.isRedisConnected()`

## Dependencies

- `@modelcontextprotocol/sdk` - Core MCP SDK with OAuth support
- `next` - Next.js framework for API routes
- `ioredis` - Redis client for session persistence (optional, auto-falls back to in-memory)

## References

- [Smithery TypeScript OAuth Client Cookbook](https://smithery.ai/docs/cookbooks/typescript_oauth_client)
- [Smithery GitHub Example](https://github.com/smithery-ai/smithery-cookbook/tree/main/clients/typescript/simple-oauth)
- [MCP Specification](https://modelcontextprotocol.io/)
