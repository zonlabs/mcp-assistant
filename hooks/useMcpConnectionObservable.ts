/**
 * useMcpConnectionObservable
 * React hook for observable MCP connections
 * Inspired by Cloudflare agents pattern
 */

import { useEffect, useCallback, useState } from 'react';
import {
  mcpConnectionManager,
  type ConnectionEvent,
  type ConnectionPhase,
  type ConnectOptions,
} from '@/lib/mcp/connection-manager';
import { useMcpStore } from '@/lib/stores/mcp-store';
import toast from 'react-hot-toast';

interface UseMcpConnectionObservableOptions {
  onPhaseChange?: (event: ConnectionEvent) => void;
  onConnected?: (event: ConnectionEvent) => void;
  onError?: (event: ConnectionEvent) => void;
}

/**
 * Hook for managing observable MCP connections
 * Subscribes to connection manager events and syncs with Zustand store
 */
export function useMcpConnectionObservable(options?: UseMcpConnectionObservableOptions) {
  const [currentPhase, setCurrentPhase] = useState<Map<string, ConnectionPhase>>(new Map());
  const updateConnectionStatus = useMcpStore((state) => state.updateConnectionStatus);

  /**
   * Handle connection phase events
   */
  const handlePhaseEvent = useCallback(
    (event: ConnectionEvent) => {
      console.log('[MCP Observable] Phase:', event.phase, event);

      // Update local phase tracking
      setCurrentPhase((prev) => {
        const next = new Map(prev);
        next.set(event.serverId, event.phase);
        return next;
      });

      // Sync with Zustand store
      if (event.sessionId) {
        // Map phases to Zustand connection status
        const statusMap: Record<ConnectionPhase, string> = {
          connecting: 'CONNECTING',
          authenticating: 'AUTHENTICATING',
          authenticated: 'AUTHENTICATED',
          discovering: 'DISCOVERING',
          connected: 'CONNECTED',
          error: 'FAILED',
        };

        const status = statusMap[event.phase];
        if (status) {
          // If first phase (connecting), create the connection entry
          if (event.phase === 'connecting') {
            const store = useMcpStore.getState();
            useMcpStore.setState({
              connections: {
                ...store.connections,
                [event.sessionId]: {
                  sessionId: event.sessionId,
                  serverId: event.serverId,
                  serverName: event.serverName,
                  url: event.serverUrl,
                  transport: 'sse',
                  connectionStatus: 'CONNECTING',
                  tools: [],
                  connectedAt: new Date().toISOString(),
                },
              },
            });
          } else {
            // Update existing connection
            updateConnectionStatus(
              event.sessionId,
              status as any,
              event.tools
            );
          }
        }
      }

      // Call custom handlers
      options?.onPhaseChange?.(event);

      if (event.phase === 'connected') {
        options?.onConnected?.(event);
        toast.success(
          `Connected to ${event.serverName}${event.toolCount ? ` (${event.toolCount} tools)` : ''}`
        );
      } else if (event.phase === 'error') {
        options?.onError?.(event);
        const phaseContext = event.errorPhase ? ` during ${event.errorPhase}` : '';
        toast.error(`Failed to connect to ${event.serverName}${phaseContext}: ${event.error}`);
      }
    },
    [updateConnectionStatus, options]
  );

  /**
   * Subscribe to connection manager events
   */
  useEffect(() => {
    mcpConnectionManager.on('phase', handlePhaseEvent);

    return () => {
      mcpConnectionManager.off('phase', handlePhaseEvent);
    };
  }, [handlePhaseEvent]);

  /**
   * Connect to a server
   */
  const connect = useCallback(
    async (options: ConnectOptions): Promise<string> => {
      try {
        return await mcpConnectionManager.connect(options);
      } catch (error) {
        console.error('[MCP Observable] Connection error:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Disconnect from a server
   */
  const disconnect = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await mcpConnectionManager.disconnect(sessionId);

      // Remove from Zustand store
      const store = useMcpStore.getState();
      const { [sessionId]: removed, ...rest } = store.connections;
      useMcpStore.setState({ connections: rest });
    } catch (error) {
      console.error('[MCP Observable] Disconnect error:', error);
      toast.error('Failed to disconnect');
    }
  }, []);

  /**
   * Cancel a pending connection
   */
  const cancelConnection = useCallback((serverId: string): void => {
    mcpConnectionManager.cancelConnection(serverId);
    setCurrentPhase((prev) => {
      const next = new Map(prev);
      next.delete(serverId);
      return next;
    });
  }, []);

  /**
   * Get current phase for a server
   */
  const getPhase = useCallback(
    (serverId: string): ConnectionPhase | undefined => {
      return currentPhase.get(serverId);
    },
    [currentPhase]
  );

  /**
   * Check if a server is connecting
   */
  const isConnecting = useCallback(
    (serverId: string): boolean => {
      const phase = currentPhase.get(serverId);
      return phase !== undefined && phase !== 'connected' && phase !== 'error';
    },
    [currentPhase]
  );

  return {
    connect,
    disconnect,
    cancelConnection,
    getPhase,
    isConnecting,
    currentPhase,
  };
}
