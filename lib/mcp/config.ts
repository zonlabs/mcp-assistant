import { sessionStore } from "./session-store";
import type { McpServerConfig } from "@/types/mcp";

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
    const mcpSessions = await sessionStore.getUserMcpSessions(userId);

    for (const sessionId of mcpSessions) {
        try {
            const sessionData = await sessionStore.getSession(sessionId);

            // Filter only active sessions, remove others
            if (!sessionData || !sessionData.active) {
                await sessionStore.removeSession(sessionId);
                continue;
            }

            const client = await sessionStore.getClient(sessionId);
            if (!client) continue;

            const transport = client.getTransportType();
            const url = client.getServerUrl();

            if (!transport || !url) continue;

            // 🔐 MCP OAuth token (optional)
            let headers: Record<string, string> | undefined;

            const oauthProvider = client.oauthProvider;
            const tokens = oauthProvider?.tokens();

            if (tokens?.access_token) {
                headers = {
                    Authorization: `Bearer ${tokens.access_token}`,
                };
            }

            mcpConfig[sessionId] = {
                transport,
                url,
                ...(sessionData.serverName && {
                    serverName: sessionData.serverName,
                    serverLabel: sanitizeServerLabel(sessionData.serverName)
                }),
                ...(headers && { headers }),
            };
        } catch (error) {
            await sessionStore.removeSession(sessionId);
            console.warn(
                `[MCP] Failed to get OAuth token for sessionId ${sessionId}`,
                error
            );
        }
    }

    return mcpConfig;
}
