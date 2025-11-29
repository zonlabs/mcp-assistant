"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { connectionStore, StoredConnection } from "@/lib/mcp/connection-store";

interface ConnectionContextValue {
    connections: Record<string, StoredConnection>;
    activeCount: number;
    syncConnections: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

export function ConnectionProvider({ children }: { children: ReactNode }) {
    const [connections, setConnections] = useState<Record<string, StoredConnection>>({});
    const [activeCount, setActiveCount] = useState(0);

    const syncConnections = useCallback(() => {
        const allConnections = connectionStore.getAll();
        setConnections(allConnections);

        const connectedCount = Object.values(allConnections).filter(
            conn => conn.connectionStatus === 'CONNECTED'
        ).length;
        setActiveCount(connectedCount);
    }, []);

    // Initial load and validation
    useEffect(() => {
        const validateAndLoad = async () => {
            await connectionStore.getValidConnections();
            syncConnections();
        };
        validateAndLoad();
    }, [syncConnections]);

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
