'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ServerIcon } from '../common/ServerIcon';

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
      const sessionId = data.sessionId;

      // If response contains an auth URL, open popup window
      const authUrl = data.authUrl || data.url;
      if (authUrl) {
        console.log('Opening popup with URL:', authUrl);

        // Open popup window with specific dimensions
        const width = 600;
        const height = 700;
        const left = Math.round(window.screenX + (window.outerWidth - width) / 2);
        const top = Math.round(window.screenY + (window.outerHeight - height) / 2);

        try {
          const popup = window.open(
            authUrl,
            'oauth-popup',
            `width=${width},height=${height},left=${left},top=${top},popup=yes,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=yes`
          );

          if (popup && !popup.closed) {
            console.log('Popup opened successfully');
            popup.focus();

            let popupCheckInterval: NodeJS.Timeout | null = null;

            const handleMessage = (event: MessageEvent) => {
              // Verify the message is from our domain
              if (event.origin !== window.location.origin) {
                console.warn('Ignoring message from unknown origin:', event.origin);
                return;
              }

              console.log('Received postMessage:', event.data);

              if (event.data.type === 'mcp-auth-success') {
                console.log('Auth success, approving tool');

                // Clean up listeners and interval
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                }
                window.removeEventListener('message', handleMessage);
                setIsLoading(false);

                // Approve the tool - connection already established in Redis
                // Tool's execute function will verify the connection
                onApprove({
                  sessionId: event.data.sessionId || sessionId,
                });
              } else if (event.data.type === 'mcp-auth-error') {
                console.error('Auth error:', event.data.error);

                // Clean up listeners and interval
                if (popupCheckInterval) {
                  clearInterval(popupCheckInterval);
                }
                window.removeEventListener('message', handleMessage);
                setIsLoading(false);

                onDeny();
              }
            };

            window.addEventListener('message', handleMessage);

            // Also check for popup close (fallback)
            popupCheckInterval = setInterval(() => {
              if (popup.closed) {
                console.log('Popup closed without message');
                clearInterval(popupCheckInterval!);
                window.removeEventListener('message', handleMessage);
                setIsLoading(false);
              }
            }, 500);
          } else {
            // Popup was blocked
            console.error('Popup was blocked by the browser');
            alert('Please allow popups for this site to connect your account.');
            setIsLoading(false);
          }
        } catch (popupError) {
          console.error('Error opening popup:', popupError);
          alert('Failed to open authentication window. Please check your browser settings.');
          setIsLoading(false);
        }
      } else {
        // No URL returned, connection successful without OAuth
        console.log('No auth URL, connection successful');
        setIsLoading(false);
        onApprove({
          sessionId: data.sessionId || sessionId,
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
