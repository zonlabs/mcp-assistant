import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Import session store for disconnect
import { sessionStore } from "@/lib/mcp/session-store";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const origin = (process.env.DJANGO_API_URL || process.env.BACKEND_URL)?.replace(/\/$/, "");
  if (!origin) {
    return NextResponse.json({ errors: [{ message: "Server misconfigured" }] }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { action, serverName, sessionId, serverUrl } = body;

    // Handle deactivate with session store
    if (action === 'deactivate') {
      if (!sessionId || !serverUrl) {
        return NextResponse.json(
          { errors: [{ message: "sessionId and serverUrl are required for deactivate action" }] },
          { status: 400 }
        );
      }

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
