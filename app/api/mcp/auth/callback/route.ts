import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';

/**
 * GET/POST /api/mcp/auth/callback
 *
 * OAuth callback endpoint that receives the authorization code
 * and completes the OAuth flow.
 *
 * Query parameters:
 * - code: Authorization code from OAuth provider
 * - state: Optional state parameter for CSRF protection
 * - sessionId: Session ID to identify the client
 *
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Authorization completed"
 * }
 */
export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // OAuth state parameter contains sessionId + serverName

    console.log('[Callback] Received code:', code);
    console.log('[Callback] Received state:', state);

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'Session ID is required (state parameter missing)' },
        { status: 400 }
      );
    }

    // Parse state JSON to get sessionId and serverName
    let sessionId: string;
    let serverName: string | undefined;

    try {
      const stateData = JSON.parse(state);
      sessionId = stateData.sessionId;
      serverName = stateData.serverName;
      console.log('[Callback] Parsed state - sessionId:', sessionId, 'serverName:', serverName);
    } catch {
      // Fallback: treat state as plain sessionId for backward compatibility
      sessionId = state;
      console.log('[Callback] Using state as plain sessionId:', sessionId);
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
      // Complete OAuth authorization with the code
      console.log('[Callback] Completing OAuth with sessionId:', sessionId);
      await client.finishAuth(code);
      console.log('[Callback] OAuth authorization completed successfully');

      // Store server-to-session mapping if serverName is provided
      if (serverName) {
        sessionStore.setServerSession(serverName, sessionId);
        console.log('[Callback] Stored server-to-session mapping:', serverName, '->', sessionId);
      }

      // Redirect back to MCP page with success parameters
      const successUrl = new URL('/mcp', request.url);
      successUrl.searchParams.set('step', 'success');
      successUrl.searchParams.set('sessionId', sessionId);
      if (serverName) {
        successUrl.searchParams.set('server', serverName);
      }

      return NextResponse.redirect(successUrl);
    } catch (error: unknown) {
      console.log('[Callback] OAuth authorization failed:', error);
      if (error instanceof Error) {
        // Redirect to MCP page with error parameter
        const errorUrl = new URL('/mcp', request.url);
        errorUrl.searchParams.set('step', 'error');
        errorUrl.searchParams.set('error', error.message);
        if (serverName) {
          errorUrl.searchParams.set('server', serverName);
        }
        return NextResponse.redirect(errorUrl);
      }
      const errorUrl = new URL('/mcp', request.url);
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Authorization failed');
      if (serverName) {
        errorUrl.searchParams.set('server', serverName);
      }
      return NextResponse.redirect(errorUrl);
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}
