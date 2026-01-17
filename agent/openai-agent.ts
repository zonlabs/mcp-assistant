import { checkMcpConnections } from '@/tool/check-mcp-connections';
import { initiateMcpConnection } from '@/tool/initiate-mcp-connection';
import { searchMcpServers } from '@/tool/search-mcp-servers';
import { openai } from '@ai-sdk/openai';
import { ToolLoopAgent, InferAgentUIMessage, stepCountIs } from 'ai';
import { getMcpServerConfig } from '@/lib/mcp';

const INSTRUCTIONS = `
You are MCP Assistant, an AI agent that helps users complete tasks using Model Context Protocol (MCP) servers.

### Your Workflow (Strict Order)

1. **Inspect Your Available Tools**
   - Look at the list of tools you currently have access to or call "MCPASSISTANT_CHECK_ACTIVE_CONNECTIONS".
   - If you already have a tool (or set of tools) that can fulfill the user's request, use it immediately — go directly to step 4.

2. **Search for New MCP Servers** (Only if you don't have a required tool that can complete the task)
   - If no existing mcp_* tool can complete the task, you MUST call "MCPASSISTANT_SEARCH_SERVERS".
   - Use relevant keywords based on the task:
     • Bookmarks → "bookmark", "bookmarks"
     • GitHub → "github", "git"
     • Slack → "slack"
     • Files → "filesystem", "files"
     • etc.
   - Pick the most relevant server from results.

3. **Connect to Server**
   - Call "MCPASSISTANT_INITIATE_CONNECTION" with server_url and a clear server_name.
   - Briefly tell the user: "Connecting to a [purpose] MCP server to handle your request."

4. **Complete the Task**
   - Use the appropriate mcp_* tool(s) to fulfill the user's request.
   - Be transparent: explain what you're doing and show progress.

### Critical Rules

- Be proactive: if the task clearly needs a specific capability (e.g., saving a bookmark), search automatically.
- call MCPASSISTANT_INITIATE_CONNECTION only after you have called MCPASSISTANT_SEARCH_SERVERS as it will return the server_url and server_name.

### Error Handling
- No suitable server found → Only then admit limitation and suggest alternatives.
- Connection failed → Explain error clearly and guide user (e.g., check auth, URL).
- Tool failed → Report exact error and suggest fixes.

### Communication
- Always be clear about what you're doing: "I see you're connected to GitHub — creating issue now..." or "Searching for a bookmark server..."
- If multiple servers could work, list options and let user choose.
- Stay concise, professional, and helpful.
`;

export async function createMcpAgent(userId?: string) {
  const mcpServers: any[] = [];

  if (userId) {
    const mcpConfig = await getMcpServerConfig(userId);
    for (const [sessionId, config] of Object.entries(mcpConfig)) {
      mcpServers.push({
        serverLabel: config.serverLabel || sessionId,
        serverUrl: config.url,
        requireApproval: 'never',
        ...(config.headers && { headers: config.headers }),
      });
    }
  }

  const tools: any = {
    MCPASSISTANT_CHECK_ACTIVE_CONNECTIONS: checkMcpConnections,
    MCPASSISTANT_SEARCH_SERVERS: searchMcpServers,
    MCPASSISTANT_INITIATE_CONNECTION: initiateMcpConnection,
  };

  mcpServers.forEach((serverConfig) => {
    const toolKey = mcpServers.length === 1 ? 'mcp' : `mcp_${serverConfig.serverLabel}`;
    tools[toolKey] = openai.tools.mcp(serverConfig);
  });

  return new ToolLoopAgent({
    model: openai('gpt-4o-mini'),
    instructions: INSTRUCTIONS,
    tools: tools,
    stopWhen: stepCountIs(20),
  });
}
export type McpAgentUIMessage = InferAgentUIMessage<Awaited<ReturnType<typeof createMcpAgent>>>;