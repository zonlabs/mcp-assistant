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

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve client from session store
    const client = sessionStore.getClient(sessionId);
    if (!client) {
      return NextResponse.json(
        { error: 'Invalid session ID or session expired' },
        { status: 404 }
      );
    }

    try {
      // List tools from the MCP server
      const result = await client.listTools();

      return NextResponse.json({
        tools: result.tools,
      });
    } catch (error: unknown) {
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
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
