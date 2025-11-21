import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  RESTART_MCP_SERVER_MUTATION,
  SET_MCP_SERVER_ENABLED_MUTATION,
} from "@/lib/graphql";

// Import session store for disconnect
import { sessionStore } from "@/lib/mcp/session-store";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const token = session?.googleIdToken;

  const origin = (process.env.DJANGO_API_URL || process.env.BACKEND_URL)?.replace(/\/$/, "");
  if (!origin) {
    return NextResponse.json({ errors: [{ message: "Server misconfigured" }] }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, serverName, enabled } = body;

    // Handle setEnabled and restart with GraphQL
    if (action === 'setEnabled' || action === 'restart') {
      let mutation = '';
      let variables: Record<string, unknown> = {};

      switch (action) {
        case 'setEnabled':
          mutation = SET_MCP_SERVER_ENABLED_MUTATION;
          variables = { serverName, enabled };
          break;
        case 'restart':
          mutation = RESTART_MCP_SERVER_MUTATION;
          variables = { name: serverName };
          break;
      }

      const headers: Record<string, string> = {
        "content-type": "application/json",
      };

      if (token) {
        headers.authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${origin}/api/graphql`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: mutation,
          variables
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        await response.text();
        throw new Error("Backend server returned invalid response");
      }

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Action failed');
      }

      return NextResponse.json(result);
    }

    // Handle deactivate with session store
    if (action === 'deactivate') {
      // Get the session ID for this server
      const sessionId = sessionStore.getServerSession(serverName);

      if (sessionId) {
        // Call disconnect API
        const disconnectResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/mcp/auth/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: sessionId,
          }),
        });

        if (!disconnectResponse.ok) {
          throw new Error('Failed to disconnect from server');
        }

        // Remove from session store
        sessionStore.removeServerSession(serverName);
      }

      return NextResponse.json({
        data: {
          disconnectMcpServer: {
            success: true,
            message: 'Disconnected successfully',
            server: {
              name: serverName,
              connectionStatus: 'DISCONNECTED',
              tools: []
            }
          }
        }
      });
    }

    return NextResponse.json({ errors: [{ message: "Invalid action" }] }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { errors: [{ message: error instanceof Error ? error.message : "Internal server error" }] },
      { status: 500 }
    );
  }
}
