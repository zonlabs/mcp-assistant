import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';

export const checkMcpConnectionsTool = tool({
  description: 'Check all active MCP server connections',
  inputSchema: z.object({}),
  async *execute() {
    yield { state: 'loading' as const };

    try {
      // Get the base URL - use window.location in browser or construct from env
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : 'http://localhost:3000';

      const response = await fetch(`${baseUrl}/api/mcp/connections`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        yield {
          state: 'ready' as const,
          success: true,
          connections: data.connections || [],
          count: data.count || 0,
          message: `Found ${data.count || 0} active MCP connection(s)`,
        };
      } else {
        yield {
          state: 'ready' as const,
          success: false,
          error: data.error || 'Failed to fetch connections',
          message: `Error: ${data.error || 'Failed to fetch connections'}`,
        };
      }
    } catch (error) {
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
  typeof checkMcpConnectionsTool
>;
