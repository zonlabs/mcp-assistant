'use client';

import { UserMessageProps, AssistantMessageProps } from "@copilotkit/react-ui";
import { Markdown } from "@copilotkit/react-ui";
import { User } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { ReactNode, useEffect, useState } from "react";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatAssistantMessageProps,
  useAgent,
  useCopilotKit,
  Message,
} from "@copilotkit/react-core/v2";

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

export function UserMessage({ key, message }: any) {
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
    <div key={key} className="flex justify-end px-2 sm:px-4 py-2">
      <div
        className="
          max-w-[90%] sm:max-w-[72ch]
          rounded-xl
          px-2.5 sm:px-3 py-1.5
          text-sm sm:text-md leading-relaxed
          bg-zinc-100 dark:bg-zinc-800
          border border-zinc-200 dark:border-zinc-700
          text-foreground
        "
      >
        <div className="whitespace-pre-wrap break-words">
          {getMessageContent()}
        </div>
      </div>
    </div>
  );
}


export function AssistantMessage({
  key,
  message,
  showReasoning = false,
}: any) {
  const { agent } = useAgent({ agentId: "mcpAssistant" });
  console.log(`assistant message: ${JSON.stringify(message)}`);

  const messageContent =
    typeof message === "string"
      ? message
      : isMessageLike(message)
      ? message.content || message.text || message.body || message.message || ""
      : "";

  const subComponent =
    isMessageLike(message) && typeof message.generativeUI === "function"
      ? message.generativeUI()
      : null;

  const reasoningContent = agent?.state?.reasoning_content;

  return (
    <div key={key} className="flex items-start gap-2 sm:gap-3 px-2 sm:px-4 py-2">
      <div className="flex flex-col gap-2 max-w-full sm:max-w-[90%] md:max-w-[72ch] w-full">
        {/* Reasoning block - show before message content if available and showReasoning is true */}
        {showReasoning && reasoningContent && (
          <div className="p-2.5 sm:p-3 md:p-4 bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-400 dark:border-yellow-600 rounded-r">
            <h3 className="font-medium mb-1.5 sm:mb-2 text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm">Reasoning:</h3>
            <p className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm whitespace-pre-wrap break-words">{reasoningContent}</p>
          </div>
        )}

        {messageContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm sm:text-base break-words overflow-x-auto">
            <Markdown content={messageContent} />
          </div>
        )}

        {subComponent && <div className="overflow-x-auto">{subComponent}</div>}
      </div>
    </div>
  );
}
