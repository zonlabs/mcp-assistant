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
  const session = await getServerSession(authOptions);

  const mcpAssistant = new HttpAgent({
    url: process.env.NEXT_PUBLIC_BACKEND_URL + "/api/langgraph-agent" || "http://localhost:8000/api/langgraph-agent",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.googleIdToken}`,
    },
  });

  // 🔥 Middleware to inject MCP configuration from session store
  mcpAssistant.use((input, next) => {
    const mcpSessions = input.state?.mcpSessions as string[] | undefined;

    if (!mcpSessions || mcpSessions.length === 0) {
      // No sessions, pass through without mcpConfig
      return next.run(input);
    }

    // Create an Observable that fetches configs and runs next
    return new (next.run(input).constructor as any)(async (observer: any) => {
      try {
        const mcpConfig: McpServerConfig = {};

        for (const sessionId of mcpSessions) {
          try {
            const client = await sessionStore.getClient(sessionId);

            const transport = client?.getTransportType();
            const url = client?.getServerUrl();

            if (!client || !url || !transport) {
              console.warn(`[CopilotKit] Client or URL or Transport not found for sessionId: ${sessionId}`);
              continue;
            }

            // Get OAuth headers if available
            let headers: Record<string, string> | undefined;
            try {
              const oauthProvider = client?.oauthProvider;
              if (oauthProvider) {
                const tokens = oauthProvider.tokens();
                if (tokens?.access_token) {
                  headers = {
                    Authorization: `Bearer ${tokens.access_token}`
                  };
                }
              }
            } catch (headerError) {
              console.log(`[CopilotKit] Could not fetch OAuth headers for sessionId: ${sessionId}`, headerError);
            }

            mcpConfig[sessionId] = {
              transport,
              url,
              ...(headers && { headers })
            };

            console.log(`[CopilotKit] Added config for sessionId: ${sessionId}`);
          } catch (error) {
            console.error(`[CopilotKit] Error processing sessionId ${sessionId}:`, error);
          }
        }

        // Now run next with the populated mcpConfig
        const modifiedInput = {
          ...input,
          state: {
            ...input.state,
            mcpConfig,
          },
        };

        next.run(modifiedInput).subscribe({
          next: (event: any) => observer.next(event),
          error: (err: any) => observer.error(err),
          complete: () => observer.complete(),
        });
      } catch (error) {
        observer.error(error);
      }
    });
  });


  const runtime = new CopilotRuntime({
    agents: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mcpAssistant: mcpAssistant as any,
    },
  });

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  const response = await handleRequest(req);
  return response;
};