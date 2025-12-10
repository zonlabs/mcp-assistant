import { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { connectionStore } from '@/lib/mcp/connection-store';

/**
 * Shared hook for handling OAuth callback redirects
 *
 * This hook:
 * 1. Detects OAuth callback success/error in URL params
 * 2. Fetches tools for successful connections
 * 3. Stores connection in localStorage
 * 4. Clears URL params after handling
 * 5. Optionally triggers a refresh callback
 */
export function useOAuthCallback(onSuccess?: () => void) {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const step = searchParams.get('step');
    const sessionId = searchParams.get('sessionId');
    const serverId = searchParams.get('serverId');
    const serverName = searchParams.get('server');

    if (step === 'success' && sessionId && serverId && serverName) {
      // OAuth authorization completed, fetch tools directly
      fetch(`/api/mcp/tool/list?sessionId=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          const tools = data.tools || [];

          // Store connection in localStorage using server ID
          connectionStore.set(serverId, {
            sessionId,
            serverName,
            connectionStatus: 'CONNECTED',
            tools,
            url: data.url || undefined,
            transport: data.transport || undefined,
          });

          toast.success(`Connected to ${serverName} successfully`);

          // Trigger optional success callback
          if (onSuccess) {
            onSuccess();
          }

          // Clear URL params while preserving the current path
          const currentPath = window.location.pathname;
          window.history.replaceState({}, '', currentPath);
        })
        .catch(error => {
          console.error('[OAuth Callback] Failed:', error);
          toast.error('Connected but failed to fetch tools');

          // Clear URL params even on error
          const currentPath = window.location.pathname;
          window.history.replaceState({}, '', currentPath);
        });
    } else if (step === 'error') {
      const errorMsg = searchParams.get('error') || 'OAuth authorization failed';
      toast.error(errorMsg);

      // Clear URL params
      const currentPath = window.location.pathname;
      window.history.replaceState({}, '', currentPath);
    }
  }, [onSuccess]);
}
