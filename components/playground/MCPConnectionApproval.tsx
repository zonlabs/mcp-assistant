'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ServerIcon } from '../common/ServerIcon';
import { openAuthPopup } from '@/lib/auth-popup-utils';
import { useMcpStore, type McpStore } from '@/lib/stores/mcp-store';

interface MCPConnectionApprovalProps {
  serverName: string;
  serverUrl: string;
  serverId: string;
  transportType: string;
  approvalId: string;
  onApprove: (data: any) => void;
  onDeny: () => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const validateSession = useMcpStore((state: McpStore) => state.validateSession);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      // Make API call to initiate connection
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverName,
          serverUrl,
          serverId,
          callbackUrl: `${window.location.origin}/api/mcp/auth/callback`,
          sourceUrl: `${window.location.origin}/auth/callback/success`,
          transportType,
        }),
      });

      const data = await response.json();
      console.log('Connect API response:', data);

      // Store sessionId for later reference
      let sessionId = data.sessionId;

      // Immediately store connection with VALIDATING status in Zustand
      if (sessionId) {
        useMcpStore.setState((state) => ({
          connections: {
            ...state.connections,
            [sessionId]: {
              sessionId,
              serverId,
              serverName,
              url: serverUrl,
              transport: transportType,
              connectionStatus: 'VALIDATING' as const,
              tools: [],
              connectedAt: new Date().toISOString(),
            },
          },
        }));
      }

      // If response contains an auth URL, open popup window
      const authUrl = data.authUrl || data.url;
      if (authUrl) {
        console.log('Opening popup with URL:', authUrl);

        try {
          // Use reusable auth popup utility
          const authResult = await openAuthPopup({ url: authUrl });

          // Update sessionId if it changed after OAuth
          sessionId = authResult.sessionId || sessionId;

          console.log('Auth success, validating session in Zustand');

          // Validate session to fetch tools and update status to CONNECTED
          await validateSession(sessionId);

          setIsLoading(false);

          // Approve the tool - connection already established in Redis and Zustand
          onApprove({
            sessionId,
          });
        } catch (popupError) {
          console.error('Authentication error:', popupError);
          setIsLoading(false);

          // Mark as FAILED in Zustand
          if (sessionId) {
            useMcpStore.setState((state) => ({
              connections: {
                ...state.connections,
                [sessionId]: {
                  ...state.connections[sessionId],
                  connectionStatus: 'FAILED' as const,
                },
              },
            }));
          }

          // Show user-friendly error message
          const errorMessage = popupError instanceof Error ? popupError.message : 'Authentication failed';
          if (errorMessage.includes('popup')) {
            alert('Please allow popups for this site to connect your account.');
          } else if (errorMessage.includes('cancelled')) {
            console.log('User cancelled authentication');
          } else {
            alert(`Authentication failed: ${errorMessage}`);
          }

          onDeny();
        }
      } else {
        // No URL returned, connection successful without OAuth
        console.log('No auth URL, validating session in Zustand');

        // Validate session to fetch tools and update status to CONNECTED
        await validateSession(sessionId);

        setIsLoading(false);
        onApprove({
          sessionId,
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      setIsLoading(false);
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
          disabled={isLoading}
        >
          Deny
        </Button>
        <Button
          size="default"
          onClick={handleConnect}
          variant="default"
          className="cursor-pointer gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              Connecting...
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
