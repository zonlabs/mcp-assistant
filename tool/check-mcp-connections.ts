import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';
import { GET } from '@/app/api/mcp/connections/route';
import { NextRequest } from 'next/server';

export const checkMcpConnections = tool({
  description: 'Check all active MCP server connections',
  inputSchema: z.object({}),
  async *execute() {
    yield { state: 'loading' as const };

    try {
      console.log('[checkMcpConnectionsTool] Calling route handler directly');

      // Call the route handler directly - preserves server context and auth
      const request = new NextRequest('http://localhost:3000/api/mcp/connections', {
        method: 'GET',
      });

      const response = await GET(request);

      console.log('[checkMcpConnectionsTool] Response status:', response.status);

      const data = await response.json();
      console.log('[checkMcpConnectionsTool] Response data:', data);

      if (response.ok) {
        yield {
          state: 'ready' as const,
          success: true,
          connections: data.connections || [],
          count: data.count || 0,
          message: `Found ${data.count || 0} active MCP connection(s)`,
        };
      } else {
        console.error('[checkMcpConnectionsTool] Error response:', {
          status: response.status,
          data,
        });
        yield {
          state: 'ready' as const,
          success: false,
          error: data.error || 'Failed to fetch connections',
          message: `Error: ${data.error || 'Failed to fetch connections'}`,
        };
      }
    } catch (error) {
      console.error('[checkMcpConnectionsTool] Exception caught:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      yield {
        state: 'ready' as const,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Error checking connections: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

export type CheckMcpConnectionsToolInvocation = UIToolInvocation<
  typeof checkMcpConnections
>;
