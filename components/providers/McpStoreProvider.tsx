'use client';

import { useEffect } from 'react';
import { useMcpStore, type McpStore } from '@/lib/stores/mcp-store';

/**
 * MCP Store Provider
 * Initializes the Zustand store with data on mount
 * Validates persisted connections and fetches user servers
 */
export function McpStoreProvider({ children }: { children: React.ReactNode }) {
  const validateAllSessions = useMcpStore((state: McpStore) => state.validateAllSessions);
  const fetchUserServers = useMcpStore((state: McpStore) => state.fetchUserServers);

  useEffect(() => {
    // On mount: validate all persisted sessions and fetch user servers
    const initializeConnections = async () => {
      // Validate all sessions (backend will handle expired ones)
      await validateAllSessions();

      // Fetch user servers
      await fetchUserServers();
    };

    initializeConnections();
  }, [validateAllSessions, fetchUserServers]);

  return <>{children}</>;
}
