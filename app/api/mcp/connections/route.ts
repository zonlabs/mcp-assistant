import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionStore } from "@/lib/mcp/session-store";
import { MCPClient } from '@/lib/mcp/oauth-client';
// --- Helpers ---

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function fetchConnectionTools(session: any) {
  try {
    const { userId, serverId, serverUrl, callbackUrl, transportType, sessionId } = session;

    if (!userId || !serverId || !serverUrl) return [];

    const client = new MCPClient({
      serverUrl,
      callbackUrl,
      onRedirect: () => { },
      userId,
      serverId,
      sessionId,
      transportType,
    });

    await client.connect();
    const result = await client.listTools();
    return result.tools; // Contains name, description, and inputSchema
  } catch (error) {
    console.error(`[Connections] Failed to fetch tools for session ${session.sessionId}:`, error);
    return [];
  }
}

async function normalizeConnectionData(session: any, userId: string) {
  const tools = session.active ? await fetchConnectionTools(session) : [];

  return {
    sessionId: session.sessionId,
    serverId: session.serverId, // Include serverId for lookup
    serverUrl: session.serverUrl,
    transport: session.transportType,
    active: session.active,
    connectionStatus: session.active ? "CONNECTED" : "DISCONNECTED",
    createdAt: session.createdAt,
    tokenExpiresAt: session.tokenExpiresAt ?? null,
    tools,
  };
}

// --- Route Handlers ---

export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sessions = await sessionStore.getUserSessionsData(user.id);
    const connections = await Promise.all(sessions.map(session => normalizeConnectionData(session, user.id)));

    return NextResponse.json({
      connections,
      count: connections.length,
    });
  } catch (error: any) {
    console.error("[Connections] Get error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
