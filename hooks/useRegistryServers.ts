import { useState, useEffect, useCallback, useRef } from "react";
import type { ParsedRegistryServer } from "@/types/mcp";
import { useMcpConnection } from "./useMcpConnection";

export function useRegistryServers(itemsPerPage: number = 10) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [servers, setServers] = useState<ParsedRegistryServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { mergeWithStoredState } = useMcpConnection();

  const hasNextPage = nextCursor !== null;
  const hasPreviousPage = cursorHistory.length > 0;

  // Auto-debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500); // 500ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const fetchServers = useCallback(
    async (cursor: string | null = null) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (debouncedSearch) params.append("search", debouncedSearch);
        params.append("limit", itemsPerPage.toString());
        if (cursor) params.append("cursor", cursor);

        const response = await fetch(`/api/registry?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch registry servers");
        }

        const result: {
          data: {
            servers: ParsedRegistryServer[];
            nextCursor: string | null;
            totalCount: number;
          };
        } = await response.json();

        setServers(result.data.servers);
        setNextCursor(result.data.nextCursor);
        setCurrentCursor(cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching registry servers:", err);
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, itemsPerPage]
  );

  const goToNextPage = useCallback(() => {
    if (!nextCursor) return;
    
    // Save current cursor to history before moving forward
    setCursorHistory(prev => [...prev, currentCursor || ""]);
    fetchServers(nextCursor);
  }, [nextCursor, currentCursor, fetchServers]);

  const goToPreviousPage = useCallback(() => {
    if (cursorHistory.length === 0) return;
    
    // Pop the last cursor from history
    const newHistory = [...cursorHistory];
    const previousCursor = newHistory.pop();
    setCursorHistory(newHistory);
    
    // Fetch with the previous cursor (empty string means first page)
    fetchServers(previousCursor === "" ? null : previousCursor || null);
  }, [cursorHistory, fetchServers]);

  const refetch = useCallback(() => {
    setServers([]);
    setCurrentCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
    fetchServers(null);
  }, [fetchServers]);

  useEffect(() => {
    setCurrentCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
    fetchServers(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, itemsPerPage]);

  return {
    servers: mergeWithStoredState(servers),
    loading,
    error,
    hasNextPage,
    hasPreviousPage,
    goToNextPage,
    goToPreviousPage,
    refetch,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
  };
}

