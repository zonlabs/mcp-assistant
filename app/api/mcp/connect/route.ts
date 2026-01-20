import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import { MCPClient, UnauthorizedError } from '@/lib/mcp/oauth-client';
import { createClient } from "@/lib/supabase/server";
import { nanoid } from 'nanoid';

interface ConnectRequestBody {
  serverUrl: string;
  callbackUrl: string;
  serverId?: string;
  serverName?: string;
  transportType?: 'sse' | 'streamable_http';
  sourceUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * POST /api/mcp/connect
 *
 * Initiate connection to an MCP server with OAuth authentication
 *
 * Request body:
 * {
 *   "serverUrl": "https://server.example.com/mcp",
 *   "callbackUrl": "http://localhost:3000/api/mcp/auth/callback",
 *   "serverName": "My Server" (optional),
 *   "clientId": "my-client-id" (optional),
 *   "clientSecret": "my-client-secret" (optional)
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
 *
 * Response (success - connected with provided credentials):
 * {
 *   "success": true,
 *   "sessionId": "abc123xyz"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Require authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to connect to MCP servers' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body: ConnectRequestBody = await request.json();
    const { serverUrl, callbackUrl, serverId, serverName, transportType, clientId, clientSecret } = body; // Removed sourceUrl from destructuring

    if (!serverUrl || !callbackUrl) {
      return NextResponse.json(
        { error: 'Server URL and callback URL are required' },
        { status: 400 }
      );
    }

    // Generate a new session ID for this connection attempt
    // We use the serverUrl (or a hash of it) + uuid as the serverId for now
    // In a real app, you'd probably look up the serverId from a database
    const effectiveServerId = serverId || serverUrl.replace(/[^a-zA-Z0-9]/g, '_');
    const sessionId = `${nanoid()}.${effectiveServerId}`; // Use nanoid for sessionId

    let authUrl: string | null = null;

    // Create MCP client with redirect handler and state data
    const client = new MCPClient({ // Changed MCPOAuthClient to MCPClient
      serverUrl,
      callbackUrl,
      onRedirect: (redirectUrl: string) => {
        authUrl = redirectUrl;
      },
      userId,
      serverId: effectiveServerId,
      sessionId,
      transportType,
      clientId,
      clientSecret
    });

    try {
      // Attempt to connect
      console.log('[Connect API] Attempting to connect to:', serverUrl);
      await client.connect();

      // Connection successful, session metadata is saved internally by client.connect()

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
          // Session metadata is saved internally by client.connect() before throwing UnauthorizedError
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
