import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { createClient } from "@/lib/supabase/server";
import { getMcpServerConfig } from "@/lib/mcp/config";
import type { McpServerConfig } from "@/types/mcp";

const serviceAdapter = new EmptyAdapter();

export const POST = async (req: NextRequest) => {
  /**
   * 1️⃣ get session
   */
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  /**
   * 2️⃣ Resolve MCP config (ASYNC, SERVER SIDE)
   */
  const userId = session?.user?.id;
  const mcpConfig: McpServerConfig = userId
    ? await getMcpServerConfig(userId)
    : {};

  /**
   * 3️⃣ Create MCP Agent
   */
  const mcpAssistant = new HttpAgent({
    url:
      process.env.NEXT_PUBLIC_BACKEND_URL +
      "/api/langgraph-agent" ||
      "http://localhost:8000/api/langgraph-agent",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
  });

  /**
   * 4️⃣ update agentState with mcpConfig
   */
  mcpAssistant.use((input, next) => {
    console.log("[CopilotKit] Running with mcpConfig:", mcpConfig);
    return next.run({
      ...input,
      state: {
        ...input.state,
        mcpConfig,
      },
    });
  });

  /**
   * 5️⃣ Runtime
   */
  const runtime = new CopilotRuntime({
    agents: {
      mcpAssistant,
    },
  });

  /**
   * 6️⃣ Endpoint
   */
  const { handleRequest } =
    copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint: "/api/copilotkit",
    });

  return handleRequest(req);
};
