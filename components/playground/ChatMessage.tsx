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
  const getMessageContent = () => {
    if (typeof message === "string") return message;
    if (isMessageLike(message)) {
      return (
        message.content ||
        message.text ||
        message.body ||
        message.message ||
        ""
      );
    }
    return "";
  };

  return (
    <div className="flex justify-end px-4 py-2">
      <div
        className="
          max-w-[72ch]
          rounded-xl
          px-3 py-1.5
          text-md leading-relaxed
          bg-zinc-100 dark:bg-zinc-800
          border border-zinc-200 dark:border-zinc-700
          text-foreground
        "
      >
        <div className="whitespace-pre-wrap">
          {getMessageContent()}
        </div>
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
    <div className="flex items-start gap-3 px-4 py-2">
  {/* Avatar */}
  {/* {showAvatar && (
    <div className="shrink-0 w-8 h-8 mt-0.5">
      <AssistantAvatar />
    </div>
  )} */}

  {/* Content */}
  <div className={`flex flex-col gap-2 ${showAvatar ? "max-w-[72ch]" : "w-full"}`}>
    {/* Message content */}
    {messageContent && !isLoading && (
      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed">
        <Markdown content={messageContent} />
      </div>
    )}

    {/* Tool calls / MCP UI */}
    {subComponent && (
      <div className="w-full">
        {subComponent}
      </div>
    )}

    {/* Loading indicator */}
    {isLoading && !messageContent && (
      <div className="flex items-center gap-1 h-5">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
      </div>
    )}
  </div>
</div>

  );
}