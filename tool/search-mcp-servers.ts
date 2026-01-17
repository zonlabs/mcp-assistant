import { UIToolInvocation, tool } from 'ai';
import { z } from 'zod';
import { SEARCH_MCP_SERVERS_QUERY } from '@/lib/graphql';
import { findRelevantContent } from '@/lib/ai/embedding';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const GRAPHQL_ENDPOINT = `${BACKEND_URL}/api/graphql`;

export const searchMcpServers = tool({
  description: `Search for MCP servers in the registry by name or description. Use this to find specific MCP servers like "Exa", "Brave Search", "GitHub", "Google Drive", etc.

IMPORTANT: This searches for SERVER NAMES, not the content you want to search for.
- To search the web for "LLM optimization", first find the "Exa" or "Brave Search" server, connect to it, then use its tools.
- To search GitHub repos, first find the "GitHub" server, connect to it, then use its tools.

Examples:
- searchQuery: "Brave" - finds the Brave Search server
- searchQuery: "GitHub" - finds the GitHub server`,
  inputSchema: z.object({
    searchQuery: z.string().optional().describe('Name of the MCP server to find (e.g., "Exa", "GitHub", "Brave Search")'),
    first: z.number().optional().default(10).describe('Number of results to return (default: 10)'),
    after: z.string().optional().describe('Cursor for pagination'),
  }),
  async *execute({ searchQuery, first, after }) {
    yield { state: 'loading' as const };

    try {
      let embeddingResults: any[] = [];
      let textSearchResults: any[] = [];

      // 1. Semantic search using embeddings (if query provided)
      if (searchQuery) {
        try {
          const embeddings = await findRelevantContent(
            searchQuery,
            'mcp_server_embeddings',
            0.5, // similarity threshold
            first || 10
          );

          // Embeddings now contain full server metadata
          embeddingResults = embeddings.map((emb: any) => ({
            id: emb.server_id,
            name: emb.server_name,
            url: emb.server_url,
            description: emb.description,
            transport: emb.transport,
            similarity: emb.similarity,
            matchType: 'semantic'
          }));
        } catch (embError) {
          console.error('[Search] Embedding search failed:', embError);
          // Continue with text search even if embedding search fails
        }
      }

      console.log('[Search] Embedding Results:', embeddingResults);

      // 2. Text-based GraphQL search
      const filters: any = {};
      if (searchQuery) {
        filters.name = { iContains: searchQuery };
      }

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
        textSearchResults = data.data.mcpServers.edges.map((edge: any) => edge.node);
        const pageInfo = data.data.mcpServers.pageInfo;

        // 3. Semantic results already have full server metadata from embeddings
        // Group by unique server ID and keep highest similarity
        const uniqueSemanticServers = embeddingResults.reduce((acc: any[], curr: any) => {
          const existing = acc.find(s => s.id === curr.id);
          if (!existing || curr.similarity > existing.similarity) {
            if (existing) {
              // Replace with higher similarity result
              const index = acc.indexOf(existing);
              acc[index] = curr;
            } else {
              acc.push(curr);
            }
          }
          return acc;
        }, []).sort((a: any, b: any) => b.similarity - a.similarity);

        // 4. Mark text search results
        const textServers = textSearchResults.map((server: any) => ({
          ...server,
          matchType: 'text'
        }));

        console.log('[Search] Semantic servers:', uniqueSemanticServers);

        yield {
          state: 'ready' as const,
          success: true,
          servers: textServers, // Text search results
          semanticResults: uniqueSemanticServers, // Semantic search results with metadata
          count: textServers.length,
          semanticCount: uniqueSemanticServers.length,
          hasNextPage: pageInfo.hasNextPage,
          endCursor: pageInfo.endCursor,
          message: `Found ${textServers.length} text matches and ${uniqueSemanticServers.length} semantic matches${searchQuery ? ` for "${searchQuery}"` : ''}`,
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
