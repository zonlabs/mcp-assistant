import { NextRequest, NextResponse } from 'next/server';
import { MCPClient } from '@/lib/mcp/oauth-client';
import { sessionStore } from '@/lib/mcp/session-store';
import { createClient } from "@/lib/supabase/server";

/**
 * Call a tool on a connected MCP server
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, toolName, toolInput, serverName } = body;

    if (!sessionId || !toolName) {
      return NextResponse.json(
        { error: 'sessionId and toolName are required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Extract serverId from sessionId
    const parts = sessionId.split('.');
    const serverId = parts.length > 1 ? parts.slice(1).join('.') : sessionId;

    // Retrieve session data from session store
    const sessionData = await sessionStore.getSession(userId, serverId);
    if (!sessionData || !sessionData.userId || !sessionData.serverId) {
      return NextResponse.json(
        {
          data: {
            callMcpServerTool: {
              success: false,
              message: "Invalid session or session expired. Please reconnect.",
              toolName,
              serverName,
              result: null,
              error: "Invalid session or session expired"
            }
          }
        },
        { status: 200 }
      );
    }

    // Create MCP client
    const client = new MCPClient({
      serverUrl: sessionData.serverUrl,
      callbackUrl: sessionData.callbackUrl,
      onRedirect: () => { },
      userId: sessionData.userId,
      serverId: sessionData.serverId,
      sessionId,
      transportType: sessionData.transportType,
    });

    // Connect to the server
    try {
      await client.connect();
    } catch (error) {
      return NextResponse.json(
        {
          data: {
            callMcpServerTool: {
              success: false,
              message: "Failed to connect to server. Please reconnect.",
              toolName,
              serverName,
              result: null,
              error: error instanceof Error ? error.message : "Connection failed"
            }
          }
        },
        { status: 200 }
      );
    }

    try {
      // Call the tool on the MCP server
      const result = await client.callTool(toolName, toolInput || {});
      return NextResponse.json({
        data: {
          callMcpServerTool: {
            success: true,
            message: 'Tool called successfully',
            toolName,
            serverName,
            result,
            error: null
          }
        }
      });
    } catch (error: unknown) {
      console.error(`[Tool Call] Error calling ${toolName}:`, error);
      return NextResponse.json({
        data: {
          callMcpServerTool: {
            success: false,
            message: `Failed to call tool ${toolName}`,
            toolName,
            serverName,
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      });
    }
  } catch (error: unknown) {
    console.error('[Tool Call] Request error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
