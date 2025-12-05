import { NextRequest, NextResponse } from 'next/server';
import { sessionStore } from '@/lib/mcp/session-store';
import type { McpServerConfig } from '@/types/mcp';

/**
 * POST /api/mcp/server-config
 *
 * Fetches MCP server configurations from session store using sessionIds

 * Request headers:
 * - Origin or Referer: Must match allowed backend URL
 *
 * Request body:
 * {
 *   "sessionIds": ["session1", "session2", ...]
 * }
 *
 * Response:
 * {
 *   "serverConfig": {
 *     "session1": { "transport": "sse", "url": "...", "headers": { "Authorization": "..." } },
 *     "session2": { "transport": "sse", "url": "...", "headers": { "Authorization": "..." } },
 *     ...
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request origin (Known backend only)
    const allowedBackendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Check if request is from allowed backend domain
    const requestOrigin = origin || (referer ? new URL(referer).origin : null);

    if (!requestOrigin) {
      console.warn('[Server Config] Unauthorized access attempt - no origin/referer');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Normalize URLs for comparison (remove trailing slashes)
    const normalizedOrigin = requestOrigin.replace(/\/$/, '');
    const normalizedBackend = allowedBackendUrl.replace(/\/$/, '');

    if (normalizedOrigin !== normalizedBackend) {
      console.warn(`[Server Config] Unauthorized access attempt from: ${requestOrigin}`);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const sessionIds: string[] = body.sessionIds;

    if (!sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json(
        { error: 'Invalid sessionIds array provided' },
        { status: 400 }
      );
    }

    const serverConfig: McpServerConfig = {};

    // For each sessionId, fetch the MCP client and build config
    for (const sessionId of sessionIds) {
      try {
        // Fetch the MCP client from session store
        const client = await sessionStore.getClient(sessionId);

        if (!client) {
          console.warn(`[Server Config] Client not found for sessionId: ${sessionId}`);
          continue;
        }

        // Get transport and URL from client
        const transport = client.getTransportType();
        const url = client.getServerUrl();

        if (!url) {
          console.warn(`[Server Config] No URL found for sessionId: ${sessionId}`);
          continue;
        }

        // Get valid tokens, refreshing if expired
        try {
          const tokenValid = await client.getValidTokens();
          if (!tokenValid) {
            console.warn(`[Server Config] Token invalid and refresh failed for sessionId: ${sessionId}`);
          } else {
            // If token was refreshed, update it in session store
            const oauthProvider = client.oauthProvider;
            if (oauthProvider) {
              const tokens = oauthProvider.tokens();
              if (tokens) {
                await sessionStore.updateTokens(sessionId, tokens);
                console.log(`[Server Config] Updated refreshed tokens for sessionId: ${sessionId}`);
              }
            }
          }
        } catch (refreshError) {
          console.log(`[Server Config] Token refresh check failed for sessionId: ${sessionId}:`, refreshError);
        }

        // Extract OAuth headers if available
        let headers: Record<string, string> | undefined;
        try {
          const oauthProvider = (client as unknown as {
            oauthProvider?: { tokens: () => { access_token?: string } }
          }).oauthProvider;

          if (oauthProvider) {
            const tokens = oauthProvider.tokens();
            if (tokens && tokens.access_token) {
              headers = {
                Authorization: `Bearer ${tokens.access_token}`
              };
            }
          }
        } catch (headerError) {
          console.log(`[Server Config] Could not fetch OAuth headers for sessionId: ${sessionId}:`, headerError);
        }

        // Build server config entry using sessionId as key
        serverConfig[sessionId] = {
          transport,
          url,
          ...(headers && { headers })
        };

        console.log(`[Server Config] Added config for sessionId: ${sessionId}`);

      } catch (error) {
        console.error(`[Server Config] Error processing sessionId ${sessionId}:`, error);
        continue;
      }
    }

    return NextResponse.json({ serverConfig });

  } catch (error: unknown) {
    console.error('[Server Config] Unexpected error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Failed to process server config' },
      { status: 500 }
    );
  }
}
