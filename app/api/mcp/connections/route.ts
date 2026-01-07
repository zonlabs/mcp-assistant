import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sessionStore } from "@/lib/mcp/session-store";

export async function GET(_request: NextRequest) {
  try {
    /**
     * 🔐 Supabase auth (AUTH ONLY)
     */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /**
     * 🔑 Fetch all MCP sessions for user from Redis
     */
    const sessions = await sessionStore.getUserSessionsData(user.id);

    /**
     * Normalize response
     */
    const connections = sessions.map((session) => ({
      sessionId: session.sessionId,
      serverUrl: session.serverUrl,
      callbackUrl: session.callbackUrl,
      transport: session.transportType,
      active: session.active,
      connectionStatus: session.active ? "CONNECTED" : "DISCONNECTED",
      createdAt: session.createdAt,
      tokenExpiresAt: session.tokenExpiresAt ?? null,
      // hasTokens: Boolean(session.tokens),
      // headers: session.headers ?? {},
      clientInformation: session.clientInformation ?? null,
    }));

    return NextResponse.json({
      connections,
      count: connections.length,
    });
  } catch (error) {
    console.error("[API] Get connections error:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
