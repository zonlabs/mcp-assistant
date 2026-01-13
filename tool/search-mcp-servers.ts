import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';
import { SEARCH_MCP_SERVERS_QUERY } from '@/lib/graphql';

export const searchMcpServersTool = tool({
  description: 'Search for MCP servers in the registry using filters',
  inputSchema: z.object({
    searchQuery: z.string().optional().describe('Search query to filter servers by name'),
    first: z.number().optional().default(10).describe('Number of results to return (default: 10)'),
    after: z.string().optional().describe('Cursor for pagination'),
    categorySlug: z.string().optional().describe('Filter by category slug'),
  }),
  async *execute({ searchQuery, first, after, categorySlug }) {
    yield { state: 'loading' as const };

    try {
      // Get the base URL - use window.location in browser or construct from env
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : 'http://localhost:3000';

      // Build filters object
      const filters: any = {};

      if (searchQuery) {
        filters.name = searchQuery;
      }

      if (categorySlug) {
        filters.categorySlug = categorySlug;
      }

      const response = await fetch(`${baseUrl}/api/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: SEARCH_MCP_SERVERS_QUERY,
          variables: {
            first: first || 10,
            after: after || null,
            filters: Object.keys(filters).length > 0 ? filters : null,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.data?.mcpServers) {
        const servers = data.data.mcpServers.edges.map((edge: any) => edge.node);
        const pageInfo = data.data.mcpServers.pageInfo;

        yield {
          state: 'ready' as const,
          success: true,
          servers,
          count: servers.length,
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
          message: `Found ${servers.length} MCP server(s)${searchQuery ? ` matching "${searchQuery}"` : ''}`,
        };
      } else if (data.errors) {
        yield {
          state: 'ready' as const,
          success: false,
          error: data.errors[0]?.message || 'GraphQL error',
          message: `Error: ${data.errors[0]?.message || 'GraphQL error'}`,
        };
      } else {
        yield {
          state: 'ready' as const,
          success: false,
          error: 'Failed to search servers',
          message: 'Failed to search servers',
        };
      }
    } catch (error) {
      yield {
        state: 'ready' as const,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Error searching servers: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

export type SearchMcpServersToolInvocation = UIToolInvocation<
  typeof searchMcpServersTool
>;
