# MCP OAuth Client Implementation

This directory contains a complete implementation of an MCP (Model Context Protocol) client with OAuth 2.0 authentication and Redis-backed state management.

## Architecture

The implementation is designed for stateless environments (like Next.js API Routes) and consists of three main components:

### 1. Session Management (`session-store.ts`)

Manages MCP connection metadata and OAuth state using a unified Redis-backed storage. The `sessionId` is the primary key for all data.

**Key Point: Client side Tracking**
For easier tracking in the client side, the **`serverUrl`** (or a sanitized version of it) can be used as or associated with the **`sessionId`**. This allows the UI to easily map back connection states to specific servers.

```typescript
// Example: Using a sanitized server URL as a persistent serverId
const serverId = serverUrl.replace(/[^a-zA-Z0-9]/g, '_');
const sessionId = `${nanoid()}.${serverId}`; // Combined ID for unique sessions per server
```

### 2. OAuth Provider (`redis-oauth-client-provider.ts`)

A specialized implementation of the MCP SDK's `AgentsOAuthProvider` that stores tokens, client info, and PKCE verifiers directly in the Redis session.

### 3. MCP Client (`oauth-client.ts`)

The primary interface for MCP interactions. It is **self-sufficient**, meaning it can re-hydrate its full state (including `serverUrl` and tokens) using only the `sessionId`.

```typescript
// Re-hydrate and connect using just the session ID tracked by the frontend
const client = new MCPClient({ userId, sessionId });
await client.connect(); 
```

## API Summary

- **`POST /api/mcp/connect`**: Initiates a connection, generates a `sessionId` (linked to the `serverUrl`), and returns OAuth details.
- **`GET /api/mcp/auth/callback`**: Completes the handshake using the `sessionId` passed in the OAuth `state`.
- **`POST /api/mcp/tool/call`**: Executes a tool using the `sessionId` to restore the connection.

---

## Features

- **Silent Token Refresh**: Checks and refreshes tokens pre-emptively before tool calls.
- **Popup Blocker Friendly**: Optimized flow to satisfy browser security during OAuth initiation.
- **Stateless Re-hydration**: No need to persist URLs in multiple places; the `sessionId` is enough to restore the full context.
