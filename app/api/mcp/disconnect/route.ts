import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import { createClient } from "@/lib/supabase/server";
import { RedisOAuthClientProvider } from '@/lib/mcp/redis-oauth-client-provider';

interface DisconnectRequestBody {
  sessionId: string;
}

/**
 * POST /api/mcp/disconnect
 *
 * Disconnect from an MCP server and clean up the session
 *
 * Request body:
 * {
 *   "sessionId": "abc123xyz"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Disconnected successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Require authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to disconnect from MCP servers' },
        { status: 401 }
      );
    }

    const body: DisconnectRequestBody = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Extract serverId from sessionId (format: sessionId.serverId)
    const parts = sessionId.split('.');
    const serverId = parts.length > 1 ? parts.slice(1).join('.') : sessionId;

    // Check if session exists
    const sessionData = await sessionStore.getSession(userId, serverId);
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Invalid session or already disconnected' },
        { status: 404 }
      );
    }

    // Clean up OAuth state from RedisOAuthClientProvider
    if (sessionData.serverId && sessionData.userId) {
      try {
        const provider = new RedisOAuthClientProvider(
          sessionData.userId,
          sessionData.serverId,
          'MCP Assistant',
          sessionData.callbackUrl,
          undefined,
          sessionId
        );
        await provider.invalidateCredentials('all');
      } catch (error) {
        console.error('Failed to clean up OAuth state:', error);
      }
    }

    // Remove session from session store
    await sessionStore.removeSession(userId, serverId);

    return NextResponse.json({
      success: true,
      message: 'Disconnected successfully',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process disconnect request' },
      { status: 500 }
    );
  }
}
