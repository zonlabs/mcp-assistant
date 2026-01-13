import { checkMcpConnectionsTool } from '@/tool/check-mcp-connections';
import { initiateMcpConnection } from '@/tool/initiate-mcp-connection';
import { searchMcpServersTool } from '@/tool/search-mcp-servers';
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent, InferAgentUIMessage, stepCountIs } from 'ai';

const INSTRUCTIONS = `You are MCP Assistant. Help users interact with Model Context Protocol (MCP) servers to help them with their tasks.

Workflow:
1. Check active connections first (checkMcpConnectionsTool)
2. Search for servers if needed (searchMcpServersTool)
3. Initiate connection if found (initiateMcpConnection - requires approval)
4. Use connected server's tools to complete tasks

Be transparent about actions. Explain errors clearly. Guide through OAuth when needed.`;

export const mcpAgent = new ToolLoopAgent({
  model: openai('gpt-4o-mini'),
  instructions: INSTRUCTIONS,
  tools: {
    checkMcpConnectionsTool,
    searchMcpServersTool,
    initiateMcpConnection,
  },
   stopWhen: stepCountIs(5),

});

export type McpAgentUIMessage = InferAgentUIMessage<typeof mcpAgent>;