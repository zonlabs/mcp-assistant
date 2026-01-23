'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ServerIcon } from '../common/ServerIcon';
import { useMcpConnectionObservable } from '@/hooks/useMcpConnectionObservable';
import type { ConnectionPhase } from '@/lib/mcp/connection-manager';

interface MCPConnectionApprovalProps {
  serverName: string;
  serverUrl: string;
  serverId: string;
  transportType: string;
  approvalId: string;
  onApprove: (data: any) => void;
  onDeny: () => void;
}

/**
 * Get user-friendly status message for connection phase
 */
function getStatusMessage(phase: ConnectionPhase): string {
  switch (phase) {
    case 'connecting':
      return 'Connecting to server...';
    case 'authenticating':
      return 'Authenticating...';
    case 'authenticated':
      return 'Authentication successful...';
    case 'discovering':
      return 'Discovering tools...';
    case 'connected':
      return 'Connected!';
    case 'error':
      return 'Connection failed';
    default:
      return 'Connecting...';
  }
}

export function MCPConnectionApproval({
  serverName,
  serverUrl,
  serverId,
  transportType,
  approvalId,
  onApprove,
  onDeny,
}: MCPConnectionApprovalProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { connect, getPhase, isConnecting } = useMcpConnectionObservable({
    onConnected: (event) => {
      console.log('[MCPConnectionApproval] Connection completed:', event);
      setSessionId(event.sessionId);
      onApprove({ sessionId: event.sessionId });
    },
    onError: (event) => {
      console.error('[MCPConnectionApproval] Connection error:', event);
      onDeny();
    },
  });

  const currentPhase = getPhase(serverId);
  const connecting = isConnecting(serverId);

  const handleConnect = async () => {
    try {
      await connect({
        serverId,
        serverName,
        serverUrl,
        transport: transportType as 'sse' | 'streamable-http',
      });
    } catch (error) {
      console.error('[MCPConnectionApproval] Connection failed:', error);
      onDeny();
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg shadow-sm animate-in fade-in slide-in-from-bottom-2 max-w-2xl">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ServerIcon
          serverName={serverName}
          serverUrl={serverUrl}
          size={40}
          className="rounded-lg flex-shrink-0"
        />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-base font-semibold text-foreground truncate">
            {serverName}
          </span>
          <span className="text-xs text-muted-foreground truncate">{serverUrl}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="default"
          onClick={onDeny}
          variant="outline"
          disabled={connecting}
        >
          Deny
        </Button>
        <Button
          size="default"
          onClick={handleConnect}
          variant="default"
          className="cursor-pointer gap-2"
          disabled={connecting}
        >
          {connecting && currentPhase ? (
            <>
              <span className="text-sm">{getStatusMessage(currentPhase)}</span>
              <svg
                className="animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </>
          ) : (
            'Connect'
          )}
        </Button>
      </div>
    </div>
  );
}
