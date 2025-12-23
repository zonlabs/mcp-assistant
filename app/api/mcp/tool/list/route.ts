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
  let sessionId: string | null = null;
  try {
    const searchParams = request.nextUrl.searchParams;
    sessionId = searchParams.get('sessionId');
    // await sessionStore.clearAll();

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
    // Token validation and refresh is handled automatically by the client
    // via the onTokenRefreshed callback passed from SessionStore

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

    // Check for invalid refresh token error and clear session
    if (sessionId && error instanceof Error && (error.message.includes('Invalid refresh token') || error.name === 'InvalidGrantError' || (error as any).code === 'InvalidGrantError')) {
      console.log(`[List Tools] Clearing session ${sessionId} due to invalid refresh token`);
      await sessionStore.removeSession(sessionId);
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
