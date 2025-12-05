import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';

/**
 * GET /api/mcp/tool/list?sessionId=<sessionId>
 *
 * List all available tools from a connected MCP server
 *
 * Query parameters:
 * - sessionId: Session ID identifying the connected client
 *
 * Response:
 * {
 *   "tools": [
 *     {
 *       "name": "example_tool",
 *       "description": "An example tool",
 *       "inputSchema": {
 *         "type": "object",
 *         "properties": { ... }
 *       }
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');

    console.log('[List Tools] Request received for sessionId:', sessionId);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve client from session store
    const client = await sessionStore.getClient(sessionId);
    if (!client) {
      console.log('[List Tools] Client not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: 'Invalid session ID or session expired' },
        { status: 404 }
      );
    }

    // Get valid tokens before making request
    try {
      const tokenValid = await client.getValidTokens();
      if (!tokenValid) {
        console.warn('[List Tools] Token invalid and refresh failed for sessionId:', sessionId);
      } else {
        // If token was refreshed, update it in session store
        const oauthProvider = client.oauthProvider;
        if (oauthProvider) {
          const tokens = oauthProvider.tokens();
          if (tokens) {
            await sessionStore.updateTokens(sessionId, tokens);
            console.log('[List Tools] Updated refreshed tokens for sessionId:', sessionId);
          }
        }
      }
    } catch (refreshError) {
      console.log('[List Tools] Token refresh check failed:', refreshError);
    }

    try {
      // List tools from the MCP server
      console.log('[List Tools] Fetching tools from MCP server...');
      const result = await client.listTools();
      console.log('[List Tools] Found', result.tools.length, 'tools');

      // Get URL and transport from session store
      const sessionData = await sessionStore['redis'].get(`${sessionStore['KEY_PREFIX']}${sessionId}`);
      let url = null;
      let transport = null;

      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          url = parsed.serverUrl || null;
          transport = parsed.transportType || null;
        } catch (parseError) {
          console.log('[List Tools] Could not parse session data:', parseError);
        }
      }

      return NextResponse.json({
        tools: result.tools,
        url, // Include server URL
        transport, // Include transport type
      });
    } catch (error: unknown) {
      console.log('[List Tools] Error fetching tools:', error);
      if (error instanceof Error) {
        return NextResponse.json(
          { error: `Failed to list tools: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to list tools' },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.log('[List Tools] Unexpected error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
