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
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // OAuth state parameter contains sessionId + serverName

    // Check if OAuth provider returned an error
    if (error) {
      const errorUrl = new URL('/mcp', request.url);
      errorUrl.searchParams.set('step', 'error');
      const errorMessage = errorDescription || error;
      errorUrl.searchParams.set('error', errorMessage);
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      const errorUrl = new URL('/mcp', request.url);
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Authorization code is required');
      return NextResponse.redirect(errorUrl);
    }

    if (!state) {
      const errorUrl = new URL('/mcp', request.url);
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Session ID is required (state parameter missing)');
      return NextResponse.redirect(errorUrl);
    }

    // Parse state JSON to get sessionId, serverName, and serverUrl
    let sessionId: string;
    let serverName: string | undefined;
    let serverUrl: string | undefined;

    try {
      const stateData = JSON.parse(state);
      sessionId = stateData.sessionId;
      serverName = stateData.serverName;
      serverUrl = stateData.serverUrl;
    } catch {
      // Fallback: treat state as plain sessionId for backward compatibility
      sessionId = state;
    }

    // Retrieve client from session store
    const client = await sessionStore.getClient(sessionId);
    if (!client) {
      const errorUrl = new URL('/mcp', request.url);
      if (serverName) {
        errorUrl.searchParams.set('server', serverName);
      }
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Invalid session ID or session expired');
      return NextResponse.redirect(errorUrl);
    }

    try {
      // Complete OAuth authorization with the code
      await client.finishAuth(code);

      // Re-save client with updated OAuth tokens (important for serverless!)
      await sessionStore.setClient(
        sessionId,
        client,
        serverUrl || client.getServerUrl(),
        client.getCallbackUrl()
      );

      // Store server-to-session mapping if serverUrl is provided
      // Use serverUrl as key since it's unique (serverName can be duplicate)
      if (serverUrl) {
        await sessionStore.setServerSession(sessionId, serverUrl, sessionId);
      }

      // Redirect back to MCP page with success parameters
      const successUrl = new URL('/mcp', request.url);
      if (serverName) {
        successUrl.searchParams.set('server', serverName);
      }
      successUrl.searchParams.set('sessionId', sessionId);
      successUrl.searchParams.set('step', 'success');

      return NextResponse.redirect(successUrl);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Redirect to MCP page with error parameter
        const errorUrl = new URL('/mcp', request.url);
        if (serverName) {
          errorUrl.searchParams.set('server', serverName);
        }
        errorUrl.searchParams.set('step', 'error');
        errorUrl.searchParams.set('error', error.message);
        return NextResponse.redirect(errorUrl);
      }
      const errorUrl = new URL('/mcp', request.url);
      if (serverName) {
        errorUrl.searchParams.set('server', serverName);
      }
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Authorization failed');
      return NextResponse.redirect(errorUrl);
    }
  } catch (error: unknown) {
    const errorUrl = new URL('/mcp', request.url);
    errorUrl.searchParams.set('step', 'error');

    if (error instanceof Error) {
      errorUrl.searchParams.set('error', error.message);
    } else {
      errorUrl.searchParams.set('error', 'Failed to process callback');
    }

    return NextResponse.redirect(errorUrl);
  }
}
