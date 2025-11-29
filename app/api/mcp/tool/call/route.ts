import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';

interface CallToolRequestBody {
  sessionId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
}

/**
 * POST /api/mcp/tool/call
 *
 * Call a tool on a connected MCP server
 *
 * Request body:
 * {
 *   "sessionId": "abc123xyz",
 *   "toolName": "example_tool",
 *   "toolArgs": {
 *     "param1": "value1",
 *     "param2": "value2"
 *   }
 * }
 *
 * Response:
 * {
 *   "content": [
 *     {
 *       "type": "text",
 *       "text": "Tool execution result"
 *     }
 *   ],
 *   "isError": false
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: CallToolRequestBody = await request.json();
    const { sessionId, toolName, toolArgs } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    // Retrieve client from session store
    const client = await sessionStore.getClient(sessionId);
    if (!client) {
      return NextResponse.json(
        { error: 'Invalid session ID or session expired' },
        { status: 404 }
      );
    }

    try {
      // Call the tool on the MCP server
      const result = await client.callTool(toolName, toolArgs || {});

      return NextResponse.json({
        content: result.content,
        isError: result.isError || false,
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return NextResponse.json(
          { error: `Failed to call tool: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to call tool' },
        { status: 500 }
      );
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
