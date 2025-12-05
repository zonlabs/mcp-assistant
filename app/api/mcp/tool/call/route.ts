import { NextRequest, NextResponse } from "next/server";
import { sessionStore } from "@/lib/mcp/session-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverName, toolName, toolInput, sessionId } = body;

    if (!serverName || !toolName || !toolInput) {
      return NextResponse.json(
        { errors: [{ message: "Missing required fields: serverName, toolName, toolInput" }] },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        {
          data: {
            callMcpServerTool: {
              success: false,
              message: "Session ID required. Please reconnect to the server.",
              toolName,
              serverName,
              result: null,
              error: "Session ID required. Please reconnect to the server."
            }
          }
        },
        { status: 200 }
      );
    }

    // Retrieve client from session store
    const client = await sessionStore.getClient(sessionId);
    if (!client) {
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

    try {
      // Call the tool on the MCP server
      const result = await client.callTool(toolName, toolInput || {});

      // Extract clean content from MCP format
      let cleanResult: unknown = result.content;

      // Handle MCP format: [{ type: "text", text: "..." }]
      if (Array.isArray(result.content)) {
        const textContents = result.content
          .filter((item: { type?: string; text?: string }) => item.type === 'text' && item.text)
          .map((item: { type?: string; text?: string }) => item.text)
          .join('\n\n');

        if (textContents) {
          // Try to parse as JSON
          try {
            cleanResult = JSON.parse(textContents);
          } catch {
            // Not JSON, use plain text
            cleanResult = textContents;
          }
        }
      }

      return NextResponse.json({
        data: {
          callMcpServerTool: {
            success: true,
            message: `Tool ${toolName} executed successfully`,
            toolName,
            serverName,
            result: cleanResult,
            error: null
          }
        }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        {
          data: {
            callMcpServerTool: {
              success: false,
              message: `Error calling tool ${toolName}`,
              toolName,
              serverName,
              result: null,
              error: errorMessage
            }
          }
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { errors: [{ message: error instanceof Error ? error.message : "Internal server error" }] },
      { status: 500 }
    );
  }
}
