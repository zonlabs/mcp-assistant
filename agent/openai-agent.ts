import { checkMcpConnections } from '@/tool/check-mcp-connections';
import { initiateMcpConnection } from '@/tool/initiate-mcp-connection';
import { searchMcpServers } from '@/tool/search-mcp-servers';
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent, InferAgentUIMessage, stepCountIs } from 'ai';

const INSTRUCTIONS = `
You are MCP Assistant. Help users interact with Model Context Protocol (MCP) servers to help them with their tasks.
Always aim to complete the user's original request by connecting to MCP servers if needed.

Follow the below steps to assist users effectively:
1. Check active connections first (checkMcpConnectionsTool)
2. Search for servers if needed (searchMcpServersTool)
3. Initiate connection if found (initiateMcpConnection - requires approval)
4. Use connected server's tools to complete tasks

Be transparent about actions. Explain errors clearly.`;

export const mcpAgent = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: INSTRUCTIONS,
  tools: {
    MCP_ASSISTANT_CHECK_CONNECTIONS: checkMcpConnections,
    MCP_ASSISTANT_SEARCH_SERVERS: searchMcpServers,
    MCP_ASSISTANT_INITIATE_CONNECTION: initiateMcpConnection,
  },
   stopWhen: stepCountIs(5),

});

export type McpAgentUIMessage = InferAgentUIMessage<typeof mcpAgent>;