import { NextRequest, NextResponse } from 'next/server';
import { MCPClient } from '@/lib/mcp/oauth-client';
import { sessionStore } from '@/lib/mcp/session-store';
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from '@/lib/url';
export async function GET(request: NextRequest) {
  return handleCallback(request);
}

export async function POST(request: NextRequest) {
  return handleCallback(request);
}

async function handleCallback(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Parse state to extract all data (parse once, use everywhere)
  let sessionId: string | undefined = undefined;
  let serverId: string | undefined = undefined;
  let serverName: string | undefined = undefined;
  let serverUrl: string | undefined = undefined;
  let sourceUrl: string = '/mcp'; // Default fallback

  if (state) {
    try {
      const stateData = JSON.parse(state);
      sessionId = stateData.sessionId;
      serverId = stateData.serverId;
      serverName = stateData.serverName;
      serverUrl = stateData.serverUrl;
      sourceUrl = stateData.sourceUrl || '/mcp';
    } catch {
      // Fallback: treat state as plain sessionId for backward compatibility
      sessionId = state;
    }
  }

  // Check if OAuth provider returned an error
  if (error) {
    const errorUrl = new URL(sourceUrl, getAppUrl());
    if (serverName) errorUrl.searchParams.set('server', serverName);
    if (serverUrl) errorUrl.searchParams.set('serverUrl', serverUrl);
    errorUrl.searchParams.set('step', 'error');
    errorUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const errorUrl = new URL(sourceUrl, getAppUrl());
    if (serverName) errorUrl.searchParams.set('server', serverName);
    if (serverUrl) errorUrl.searchParams.set('serverUrl', serverUrl);
    errorUrl.searchParams.set('step', 'error');
    errorUrl.searchParams.set('error', 'Authorization code is required');
    return NextResponse.redirect(errorUrl);
  }

  if (!state || !sessionId) {
    const errorUrl = new URL(sourceUrl, getAppUrl());
    if (serverName) errorUrl.searchParams.set('server', serverName);
    if (serverUrl) errorUrl.searchParams.set('serverUrl', serverUrl);
    errorUrl.searchParams.set('step', 'error');
    errorUrl.searchParams.set('error', 'Session ID is required (state parameter missing)');
    return NextResponse.redirect(errorUrl);
  }

  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { session: userSession } } = await supabase.auth.getSession();

    if (!userSession?.user) {
      const errorUrl = new URL(sourceUrl, getAppUrl());
      if (serverName) errorUrl.searchParams.set('server', serverName);
      if (serverUrl) errorUrl.searchParams.set('serverUrl', serverUrl);
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Unauthorized - Please log in');
      return NextResponse.redirect(errorUrl);
    }

    const userId = userSession.user.id;

    if (!serverId) {
      const errorUrl = new URL(sourceUrl, getAppUrl());
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Missing serverId in OAuth state');
      return NextResponse.redirect(errorUrl);
    }

    // Retrieve session data to get serverUrl and callbackUrl
    const sessionData = await sessionStore.getSession(userId, serverId);
    if (!sessionData) {
      const errorUrl = new URL(sourceUrl, getAppUrl());
      if (serverName) errorUrl.searchParams.set('server', serverName);
      errorUrl.searchParams.set('step', 'error');
      errorUrl.searchParams.set('error', 'Invalid session or session expired');
      return NextResponse.redirect(errorUrl);
    }

    // Create MCP client and restore from session
    const client = new MCPClient({
      serverUrl: sessionData.serverUrl,
      callbackUrl: sessionData.callbackUrl,
      onRedirect: (url) => {
        console.log('[Callback] Redirect requested:', url);
      },
      userId,
      serverId,
      sessionId,
      transportType: sessionData.transportType,
    });


    // Complete OAuth authorization with the code
    console.log('[Callback] Finishing OAuth with code...');
    await client.finishAuth(code);
    console.log('[Callback] OAuth finished successfully');

    // Update session to mark as active
    // Session is updated to active=true internally by client.finishAuth()
    console.log('[Callback] Session updated successfully');

    // Redirect back to source page with success parameters
    const successUrl = new URL(sourceUrl, getAppUrl());
    if (serverId) {
      successUrl.searchParams.set('serverId', serverId);
    }
    if (serverName) {
      successUrl.searchParams.set('server', serverName);
    }
    if (serverUrl) {
      successUrl.searchParams.set('serverUrl', serverUrl);
    }
    successUrl.searchParams.set('sessionId', sessionId);
    successUrl.searchParams.set('step', 'success');

    return NextResponse.redirect(successUrl);
  } catch (error: unknown) {
    // Handle any errors during OAuth completion
    const errorUrl = new URL(sourceUrl, getAppUrl());
    if (serverName) {
      errorUrl.searchParams.set('server', serverName);
    }
    if (serverUrl) {
      errorUrl.searchParams.set('serverUrl', serverUrl);
    }
    errorUrl.searchParams.set('step', 'error');

    if (error instanceof Error) {
      errorUrl.searchParams.set('error', error.message);
    } else {
      errorUrl.searchParams.set('error', 'Failed to complete OAuth authorization');
    }

    return NextResponse.redirect(errorUrl);
  }
}
