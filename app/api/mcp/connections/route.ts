import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionStore } from "@/lib/mcp/session-store";

// --- Helpers ---

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function fetchConnectionTools(sessionId: string) {
  try {
    const client = await sessionStore.getClient(sessionId);
    if (!client) return [];

    const result = await client.listTools();
    return result.tools; // Contains name, description, and inputSchema
  } catch (error) {
    console.error(`[Connections] Failed to fetch tools for session ${sessionId}:`, error);
    return [];
  }
}

async function normalizeConnectionData(session: any) {
  const tools = session.active ? await fetchConnectionTools(session.sessionId) : [];

  return {
    sessionId: session.sessionId,
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
    const connections = await Promise.all(sessions.map(normalizeConnectionData));

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
