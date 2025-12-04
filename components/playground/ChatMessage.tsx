'use client';

import { UserMessageProps, AssistantMessageProps } from "@copilotkit/react-ui";
import { Markdown } from "@copilotkit/react-ui";
import { User } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

type MessageLike = {
  content?: string;
  text?: string;
  body?: string;
  message?: string;
  generativeUI?: () => ReactNode;
};

const isMessageLike = (value: unknown): value is MessageLike =>
  typeof value === "object" && value !== null;

function AssistantAvatar() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoSrc = resolvedTheme === "dark" ? "/images/logo-dark.png" : "/images/logo-light.png";

  return (
    <div className="w-full h-full flex items-center justify-center rounded-full bg-muted">
      {mounted ? (
        <Image
          src={logoSrc}
          alt="Assistant avatar"
          width={32}
          height={32}
          className="rounded-full object-contain"
        />
      ) : (
        null
      )}
    </div>
  );
}

export function UserMessage({ message }: UserMessageProps) {
  // Extract message content safely - handle both string and object cases
  const getMessageContent = () => {
    if (typeof message === 'string') {
      return message;
    }

    if (isMessageLike(message)) {
      // Try multiple possible properties
      return message.content || message.text || message.body || message.message || '';
    }

    return '';
  };

  return (
    <div className="flex items-start gap-3 px-4 py-3 flex-row-reverse">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8">
        <div className="w-full h-full flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Message */}
      <div className="relative py-2 px-3 rounded-2xl rounded-tr-sm max-w-[80%] text-sm leading-relaxed bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="whitespace-pre-wrap text-foreground">{getMessageContent()}</div>
      </div>
    </div>
  );
}

export function AssistantMessage({ message, isLoading }: AssistantMessageProps) {
  // Extract message content safely - handle both string and object cases
  const getMessageContent = () => {
    if (typeof message === 'string') {
      return message;
    }

    if (isMessageLike(message)) {
      // Try multiple possible properties
      return message.content || message.text || message.body || message.message || '';
    }

    return '';
  };

  const messageContent = getMessageContent();

  // Extract the generativeUI component (this is where tool renderings appear)
  const subComponent = isMessageLike(message) && typeof message.generativeUI === 'function'
    ? message.generativeUI()
    : null;

  // Don't render anything if there's no content, no subComponent, and not loading
  if (!messageContent && !subComponent && !isLoading) {
    return null;
  }

  // Only show avatar when there's message content (not just tool calls)
  // Don't show avatar during tool-only execution (even when loading)
  const showAvatar = messageContent || (isLoading && !subComponent);

  return (
    <div className="flex items-start gap-1 p-1">
      {/* Avatar - only shown when there's actual message content */}
      {showAvatar && (
        <div className="shrink-0 w-8 h-8">
          <AssistantAvatar />
        </div>
      )}

      {/* Message */}
      <div className={`flex-1 space-y-2 ${showAvatar ? 'max-w-[80%]' : 'w-full'}`}>
        {/* Message content */}
        {messageContent && !isLoading && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={messageContent} />
          </div>
        )}

        {/* Render tool calls and actions (always visible, even during loading) */}
        {subComponent && (
          <div className="w-full">
            {subComponent}
          </div>
        )}

        {/* Loading indicator - shown when loading and no content yet (even if tools are present) */}
        {isLoading && !messageContent && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"></div>
          </div>
        )}
      </div>
    </div>
  );
}