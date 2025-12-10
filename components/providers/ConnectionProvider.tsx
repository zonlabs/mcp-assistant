"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useRef, useState } from "react";
import { useMcpConnection } from "@/hooks/useMcpConnection";
import { StoredConnection, connectionStore } from "@/lib/mcp/connection-store";

interface ConnectionContextValue {
    connections: Record<string, StoredConnection>;
    activeCount: number;
    isValidating: boolean;
    progress: { validated: number; total: number } | null;
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined);

interface ConnectionProviderProps {
    children: ReactNode;
    /** Optional filter function to filter connections */
    filter?: (serverId: string) => boolean;
}

export function ConnectionProvider({ children, filter }: ConnectionProviderProps) {
    const hasValidated = useRef(false);
    const [isValidating, setIsValidating] = useState(true); // Start as true
    const [progress, setProgress] = useState<{ validated: number; total: number } | null>(null);

    // Use the refactored hook for all connection data
    const {
        connections: allConnections,
        activeConnectionCount: totalActiveCount,
        validateConnections,
    } = useMcpConnection();

    // Apply filter to connections and count
    // Only show connections after validation completes
    const { connections, activeCount } = useMemo(() => {
        // While validating, show empty state
        // REMOVED: Do not hide connections while validating (Issue #1 fixed)
        // We want to show them immediately, potentially with "Validating..." status


        if (!filter) {
            return {
                connections: allConnections,
                activeCount: totalActiveCount,
            };
        }

        const filteredConnections = Object.entries(allConnections)
            .filter(([serverId]) => filter(serverId))
            .reduce((acc, [id, conn]) => {
                acc[id] = conn;
                return acc;
            }, {} as Record<string, StoredConnection>);

        const filteredActiveCount = Object.values(filteredConnections)
            .filter(conn => conn.connectionStatus === 'CONNECTED')
            .length;

        return {
            connections: filteredConnections,
            activeCount: filteredActiveCount,
        };
    }, [allConnections, totalActiveCount, filter, isValidating]);

    // Validate connections on mount (only once)
    useEffect(() => {
        if (hasValidated.current) return;

        const validate = async () => {
            hasValidated.current = true;
            setIsValidating(true);
            setProgress(null);

            try {
                await validateConnections(
                    filter,
                    (validated, total) => {
                        setProgress({ validated, total });
                    }
                );
            } finally {
                setIsValidating(false);
                setProgress(null);
            }
        };

        validate();
    }, [filter, validateConnections]);

    const contextValue = useMemo<ConnectionContextValue>(() => ({
        connections,
        activeCount,
        isValidating,
        progress,
    }), [connections, activeCount, isValidating, progress]);

    return (
        <ConnectionContext.Provider value={contextValue}>
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
