import { tool } from 'ai';
import { z } from 'zod';
import { GET } from '@/app/api/mcp/connections/route';
import { NextRequest } from 'next/server';

export const initiateMcpConnection = tool({
  description: 'Initiate an MCP connection to a specified server',
  inputSchema: z.object({
    serverName: z.string().describe('Name of the MCP server'),
    serverUrl: z.string().describe('URL of the MCP server'),
    serverId: z.string().describe('Unique identifier for the server'),
    transportType: z.enum(['sse', 'streamable_http']).describe('Transport type for MCP connection'),
  }),
  needsApproval: true, // Require user approval
  async *execute({ serverName, serverUrl, serverId, transportType }) {
    yield { state: 'loading' as const };

    try {
      console.log('[initiateMcpConnection] Tool approved, verifying connection');

      // The approval UI already handled the connection and OAuth
      // Just verify the connection exists by checking active connections
      const request = new NextRequest('http://localhost:3000/api/mcp/connections', {
        method: 'GET',
      });

      const response = await GET(request);
      console.log('[initiateMcpConnection] Connections check status:', response.status);

      const data = await response.json();
      console.log('[initiateMcpConnection] Connections data:', data);

      if (response.ok && data.connections) {
        // Find connection for this server
        const connection = data.connections.find(
          (conn: any) => conn.serverUrl === serverUrl
        );

        if (connection && connection.active) {
          console.log('[initiateMcpConnection] Connection verified');
          yield {
            state: 'ready' as const,
            success: true,
            sessionId: connection.sessionId,
            message: `Successfully connected to ${serverName}`,
          };
        } else {
          console.warn('[initiateMcpConnection] Connection not found or inactive');
          yield {
            state: 'ready' as const,
            success: false,
            error: 'Connection not found',
            message: `Connection to ${serverName} was not established. Please try again.`,
          };
        }
      } else {
        console.error('[initiateMcpConnection] Failed to verify connections:', data);
        yield {
          state: 'ready' as const,
          success: false,
          error: data.error || 'Failed to verify connection',
          message: `Failed to verify connection to ${serverName}`,
        };
      }
    } catch (error) {
      console.error('[initiateMcpConnection] Exception caught:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      yield {
        state: 'ready' as const,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Error connecting to ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});