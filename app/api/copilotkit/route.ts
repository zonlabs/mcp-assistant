import { NextRequest } from "next/server";
import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sessionStore } from "@/lib/mcp/session-store";
import type { McpServerConfig } from "@/types/mcp";

const serviceAdapter = new EmptyAdapter();

export const POST = async (req: NextRequest) => {
  /**
   * 1️⃣ Auth
   */
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  /**
   * 2️⃣ Resolve MCP config (ASYNC, SERVER SIDE)
   */
  const userId = (session.user as any)?.id;
  const mcpConfig: McpServerConfig = {};

  if (userId) {
    const mcpSessions = await sessionStore.getUserMcpSessions(userId);

    for (const sessionId of mcpSessions) {
      const client = await sessionStore.getClient(sessionId);
      if (!client) continue;

      const transport = client.getTransportType();
      const url = client.getServerUrl();

      if (!transport || !url) continue;

      // 🔐 MCP OAuth token (optional)
      let headers: Record<string, string> | undefined;

      try {
        const oauthProvider = client.oauthProvider;
        const tokens = oauthProvider?.tokens();

        if (tokens?.access_token) {
          headers = {
            Authorization: `Bearer ${tokens.access_token}`,
          };
        }
      } catch (error) {
        console.warn(
          `[MCP] Failed to get OAuth token for sessionId ${sessionId}`,
          error
        );
      }

      mcpConfig[sessionId] = {
        transport,
        url,
        ...(headers && { headers }),
      };
    }
  }

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
      Authorization: `Bearer ${session.googleIdToken}`,
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
