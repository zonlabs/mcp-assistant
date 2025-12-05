import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { connectionStore } from '@/lib/mcp/connection-store';
import { useAutoReconnect } from './useAutoReconnect';

interface ToolCallParams {
  serverName: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  serverUrl: string;
  transportType?: 'sse' | 'streamable_http';
  onOAuthRequired?: (authUrl: string, sessionId: string) => void;
}

interface ToolCallResult {
  success: boolean;
  message: string;
  result?: unknown;
  error?: string;
}

export function useToolCall() {
  const [isExecuting, setIsExecuting] = useState(false);
  const { reconnect, isReconnecting } = useAutoReconnect();

  /**
   * Execute tool call with automatic reconnection on session expiration
   */
  const executeToolCall = useCallback(async (
    params: ToolCallParams,
    retryCount = 0
  ): Promise<ToolCallResult> => {
    const { serverName, toolName, toolInput, serverUrl, transportType, onOAuthRequired } = params;
    const MAX_RETRIES = 1; // Only retry once after reconnection

    setIsExecuting(true);

    try {
      // Get current sessionId
      let sessionId = connectionStore.getSessionId(serverName);

      if (!sessionId && retryCount === 0) {
        // No session exists, try to connect first
        toast('No active session, connecting...', { icon: '🔌' });
        sessionId = await reconnect({
          serverName,
          serverUrl,
          transportType,
          onOAuthRequired,
        });

        if (!sessionId) {
          return {
            success: false,
            message: 'Failed to establish connection',
            error: 'Could not connect to server',
          };
        }
      }

      // Call the tool
      const response = await fetch('/api/mcp/tool/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverName,
          toolName,
          toolInput,
          sessionId,
        }),
      });

      const result = await response.json();
      const toolResult = result.data?.callMcpServerTool;

      if (!toolResult) {
        throw new Error('Invalid response from server');
      }

      // Check for session expiration errors
      const isSessionExpired =
        !toolResult.success &&
        (toolResult.error?.includes('Invalid session') ||
         toolResult.error?.includes('session expired') ||
         toolResult.error?.includes('Session ID required'));

      // Auto-reconnect and retry if session expired
      if (isSessionExpired && retryCount < MAX_RETRIES) {
        // toast('Session expired, reconnecting...', { icon: '🔄' });

        const newSessionId = await reconnect({
          serverName,
          serverUrl,
          transportType,
          onOAuthRequired,
        });

        if (newSessionId) {
          // Retry the tool call with new session
          return executeToolCall(params, retryCount + 1);
        }
      }

      return toolResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Tool execution failed: ${message}`,
        error: message,
      };
    } finally {
      setIsExecuting(false);
    }
  }, [reconnect]);

  return {
    executeToolCall,
    isExecuting: isExecuting || isReconnecting,
  };
}
