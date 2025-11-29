import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { connectionStore } from '@/lib/mcp/connection-store';

interface ReconnectOptions {
  serverName: string;
  serverUrl: string;
  transportType?: 'sse' | 'streamable_http';
  onOAuthRequired?: (authUrl: string, sessionId: string) => void;
}

export function useAutoReconnect() {
  const [isReconnecting, setIsReconnecting] = useState(false);

  /**
   * Attempt to reconnect to an MCP server
   * Returns the new sessionId if successful, null otherwise
   */
  const reconnect = useCallback(async (options: ReconnectOptions): Promise<string | null> => {
    const { serverName, serverUrl, transportType, onOAuthRequired } = options;

    setIsReconnecting(true);
    toast.loading(`Reconnecting to ${serverName}...`, { id: 'reconnect' });

    try {
      const callbackUrl = `${window.location.origin}/api/mcp/auth/callback`;

      const response = await fetch('/api/mcp/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl,
          callbackUrl,
          serverName,
          transportType: transportType || 'streamable_http',
        }),
      });

      const data = await response.json();

      // OAuth required - need user interaction
      if (response.status === 401 && data.requiresAuth) {
        toast.dismiss('reconnect');
        toast('Authentication required', { icon: '🔐' });

        if (onOAuthRequired && data.authUrl && data.sessionId) {
          onOAuthRequired(data.authUrl, data.sessionId);
        }

        return null; // Can't auto-complete, needs user action
      }

      // Connection successful
      if (data.success && data.sessionId) {
        // Update localStorage with new sessionId
        connectionStore.set(serverName, {
          sessionId: data.sessionId,
          connectionStatus: 'CONNECTED',
          tools: [], // Will be fetched separately
        });

        toast.success(`Reconnected to ${serverName}`, { id: 'reconnect' });
        return data.sessionId;
      }

      throw new Error(data.error || 'Reconnection failed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Reconnection failed: ${message}`, { id: 'reconnect' });
      return null;
    } finally {
      setIsReconnecting(false);
    }
  }, []);

  return { reconnect, isReconnecting };
}
