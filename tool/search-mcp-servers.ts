import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';
import { SEARCH_MCP_SERVERS_QUERY } from '@/lib/graphql';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const GRAPHQL_ENDPOINT = `${BACKEND_URL}/api/graphql`;

export const searchMcpServers = tool({
  description: 'Search for MCP servers in the registry using filters',
  inputSchema: z.object({
    searchQuery: z.string().optional().describe('Search query to filter servers by name'),
    first: z.number().optional().default(10).describe('Number of results to return (default: 10)'),
    after: z.string().optional().describe('Cursor for pagination'),
  }),
  async *execute({ searchQuery, first, after }) {
    yield { state: 'loading' as const };

    try {
      // Build filters object
      // GraphQL expects filter fields to be objects with lookup operators
      const filters: any = {};

      if (searchQuery) {
        filters.name = { iContains: searchQuery }; // Case-insensitive substring match
      }

      // Call backend GraphQL endpoint directly (no auth required for search)
      const response = await fetch(GRAPHQL_ENDPOINT, {
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
  typeof searchMcpServers
>;
