import { UIMessage, createAgentUIStreamResponse } from 'ai';
import { mcpAgent } from '@/agent/openai-agent';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
    
  return createAgentUIStreamResponse({
    agent: mcpAgent,
    uiMessages: messages,
  });
}