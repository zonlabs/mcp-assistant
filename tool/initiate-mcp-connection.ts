import { tool } from 'ai';
import { z } from 'zod';


export const initiateMcpConnection = tool({
  description: 'Initiate an MCP connection to a specified server',
  inputSchema: z.object({
    serverName: z.string().describe('Name of the MCP server'),
    serverUrl: z.string().describe('URL of the MCP server'),
    serverId: z.string().describe('Unique identifier for the server'),
    callbackUrl: z.string().optional().describe('OAuth callback URL'),
    sourceUrl: z.string().optional().describe('Source URL to redirect after auth'),
    transportType: z.enum(['sse', 'streamable_http']).describe('Transport type for MCP connection'),
  }),
  needsApproval: true, // Require user approval
  execute: async ({ serverName, serverUrl, serverId, callbackUrl, sourceUrl, transportType }) => {
    try {
      // Get the base URL - use window.location in browser or construct from env
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/mcp/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverName,
          serverUrl,
          serverId,
          callbackUrl: callbackUrl || `${baseUrl}/api/mcp/auth/callback`,
          sourceUrl: sourceUrl || `${baseUrl}/auth/callback/success`,
          transportType,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return {
          success: true,
          sessionId: data.sessionId,
          message: `Successfully connected to ${serverName}`,
        };
      } else if (response.status === 401 && data.requiresAuth) {
        return {
          success: false,
          requiresAuth: true,
          authUrl: data.authUrl,
          sessionId: data.sessionId,
          message: `OAuth authorization required. Please visit: ${data.authUrl}`,
        };
      } else {
        return {
          success: false,
          error: data.error || 'Connection failed',
          message: `Failed to connect to ${serverName}: ${data.error || 'Unknown error'}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Error connecting to ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});