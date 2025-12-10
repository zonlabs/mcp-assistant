"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { connectionStore, StoredConnection } from "@/lib/mcp/connection-store";

interface ConnectionContextValue {
    connections: Record<string, StoredConnection>;
    activeCount: number;
    syncConnections: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

interface ConnectionProviderProps {
    children: ReactNode;
    /** Optional filter function to validate only specific connections */
    validateFilter?: (serverId: string) => boolean;
}

export function ConnectionProvider({ children, validateFilter }: ConnectionProviderProps) {
    const [connections, setConnections] = useState<Record<string, StoredConnection>>({});
    const [activeCount, setActiveCount] = useState(0);
    const isValidatingRef = useRef(false);

    const syncConnections = useCallback(() => {
        const allConnections = connectionStore.getAll();
        setConnections(allConnections);

        // Apply filter when counting active connections
        const connectionsToCount = validateFilter
            ? Object.entries(allConnections).filter(([serverId]) => validateFilter(serverId))
            : Object.entries(allConnections);

        const connectedCount = connectionsToCount.filter(
            ([_, conn]) => conn.connectionStatus === 'CONNECTED'
        ).length;
        setActiveCount(connectedCount);
    }, [validateFilter]);

    // Initial load and validation
    useEffect(() => {
        const validateAndLoad = async () => {
            // Prevent concurrent validation calls
            if (isValidatingRef.current) {
                return;
            }

            isValidatingRef.current = true;
            try {
                await connectionStore.getValidConnections(validateFilter);
                syncConnections();
            } finally {
                isValidatingRef.current = false;
            }
        };
        validateAndLoad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [validateFilter]); // Only re-run when filter changes, not when syncConnections changes

    // Listen for storage events (changes from other tabs/windows)
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'mcp_connections') {
                syncConnections();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [syncConnections]);

    // Subscribe to connection store changes (same-tab updates)
    useEffect(() => {
        const unsubscribe = connectionStore.subscribe(() => {
            // console.log('Connection store updated');
            syncConnections();
        });

        return unsubscribe;
    }, [syncConnections]);

    return (
        <ConnectionContext.Provider value={{ connections, activeCount, syncConnections }}>
            {children}
        </ConnectionContext.Provider>
    );
}

export function useConnectionContext() {
    const context = useContext(ConnectionContext);
    if (!context) {
        throw new Error("useConnectionContext must be used within ConnectionProvider");
    }
    return context;
}
