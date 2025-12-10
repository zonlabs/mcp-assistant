import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import { MCPOAuthClient, UnauthorizedError } from '@/lib/mcp/oauth-client';

interface ConnectRequestBody {
  serverUrl: string;
  callbackUrl: string;
  serverId?: string;
  serverName?: string;
  transportType?: 'sse' | 'streamable_http';
  sourceUrl?: string;
}

/**
 * POST /api/mcp/auth/connect
 *
 * Initiate connection to an MCP server with OAuth authentication
 *
 * Request body:
 * {
 *   "serverUrl": "https://server.example.com/mcp",
 *   "callbackUrl": "http://localhost:3000/api/mcp/auth/callback",
 *   "serverName": "My Server" (optional)
 * }
 *
 * Response (success - no auth required):
 * {
 *   "success": true,
 *   "sessionId": "abc123xyz"
 * }
 *
 * Response (auth required):
 * {
 *   "requiresAuth": true,
 *   "authUrl": "https://server.example.com/oauth/authorize?...",
 *   "sessionId": "abc123xyz"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConnectRequestBody = await request.json();
    const { serverUrl, callbackUrl, serverId, serverName, transportType, sourceUrl } = body;

    if (!serverUrl || !callbackUrl) {
      return NextResponse.json(
        { error: 'Server URL and callback URL are required' },
        { status: 400 }
      );
    }

    const sessionId = sessionStore.generateSessionId();
    let authUrl: string | null = null;

    // Create state object with sessionId, serverId, serverName, serverUrl, and sourceUrl
    const stateData = JSON.stringify({ sessionId, serverId, serverName, serverUrl, sourceUrl });

    // Normalize transport type (default to streamable_http if not specified)
    let normalizedTransport: 'sse' | 'streamable_http' = 'streamable_http';
    if (transportType === 'sse' || transportType === 'streamable_http') {
      normalizedTransport = transportType;
    }

    console.log('[Connect API] Using transport type:', normalizedTransport);

    // Create MCP client with redirect handler and state data
    const client = new MCPOAuthClient(
      serverUrl,
      callbackUrl,
      (redirectUrl: string) => {
        authUrl = redirectUrl;
      },
      stateData, // Pass state data (sessionId + serverName) for OAuth state parameter
      normalizedTransport // Pass transport type
    );

    try {
      // Attempt to connect
      console.log('[Connect API] Attempting to connect to:', serverUrl);
      await client.connect();

      // Connection successful, save client to session store with full config
      await sessionStore.setClient(sessionId, client, serverUrl, callbackUrl, normalizedTransport);

      return NextResponse.json({
        success: true,
        sessionId,
      });
    } catch (error: unknown) {
      console.log('[Connect API] Connection error:', error);
      if (error instanceof UnauthorizedError) {
        // OAuth authorization required
        console.log('[Connect API] OAuth required. AuthUrl:', authUrl);
        if (authUrl) {
          await sessionStore.setClient(sessionId, client, serverUrl, callbackUrl, normalizedTransport);
          return NextResponse.json(
            {
              requiresAuth: true,
              authUrl,
              sessionId,
            },
            { status: 401 }
          );
        } else {
          console.log('[Connect API] ERROR: No auth URL received!');
          return NextResponse.json(
            { error: 'OAuth authorization required but no auth URL received' },
            { status: 500 }
          );
        }
      } else if (error instanceof Error) {
        console.log('[Connect API] Error message:', error.message);
        return NextResponse.json(
          { error: error.message || 'Connection failed' },
          { status: 500 }
        );
      } else {
        return NextResponse.json(
          { error: 'Unknown error occurred' },
          { status: 500 }
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to parse request body' },
      { status: 400 }
    );
  }
}
