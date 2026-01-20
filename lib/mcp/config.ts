import { sessionStore } from "./session-store";
import type { McpServerConfig } from "@/types/mcp";
import { MCPClient } from "./oauth-client";

/**
 * Sanitize server name to create a valid server label
 * - Must start with a letter
 * - Can only contain letters, digits, '-' and '_'
 */
function sanitizeServerLabel(name: string): string {
    // Replace spaces and invalid chars with underscores
    let sanitized = name
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .toLowerCase();

    // Ensure it starts with a letter
    if (!/^[a-zA-Z]/.test(sanitized)) {
        sanitized = 's_' + sanitized;
    }

    return sanitized;
}

export async function getMcpServerConfig(userId: string): Promise<McpServerConfig> {
    const mcpConfig: McpServerConfig = {};
    const sessionIds = await sessionStore.getUserMcpSessions(userId);

    for (const sessionId of sessionIds) {
        try {
            const sessionData = await sessionStore.getSession(userId, sessionId);

            // Filter only active sessions, remove others
            if (!sessionData || !sessionData.active) {
                await sessionStore.removeSession(userId, sessionId);
                continue;
            }

            if (!sessionData.userId || !sessionData.serverId) {
                await sessionStore.removeSession(userId, sessionId);
                continue;
            }

            const transport = sessionData.transportType;
            const url = sessionData.serverUrl;

            if (!transport || !url) continue;

            // 🔐 MCP OAuth token (optional)
            let headers: Record<string, string> | undefined;

            try {
                // Use MCPClient to ensure tokens are valid and refreshed if needed
                const client = new MCPClient({
                    userId: sessionData.userId,
                    sessionId: sessionData.sessionId,
                });

                const tokens = await client.oauthProvider?.tokens();
                if (tokens?.access_token) {
                    headers = {
                        Authorization: `Bearer ${tokens.access_token}`,
                    };
                }
                
            } catch (error) {
                console.warn(
                    `[MCP] Failed to get OAuth token for session ${sessionData.sessionId}`,
                    error
                );
            }

            const label = sanitizeServerLabel(sessionData.serverName || sessionData.serverId || 'server');
            mcpConfig[label] = {
                transport,
                url,
                ...(sessionData.serverName && {
                    serverName: sessionData.serverName,
                    serverLabel: label
                }),
                ...(headers && { headers }),
            };
        } catch (error) {
            await sessionStore.removeSession(userId, sessionId);
            console.warn(
                `[MCP] Failed to process session ${sessionId}`,
                error
            );
        }
    }

    return mcpConfig;
}
