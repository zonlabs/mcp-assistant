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
    <div key={key} className="flex justify-end px-4 py-2">
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


export function AssistantMessage({
  key,
  message,
}: any) {
  const { agent } = useAgent({ agentId: "mcpAssistant" });
  console.log(`assistant message: ${JSON.stringify(message)}`);
  // console.log(`assistant agent.messages: ${JSON.stringify(agent.messages)}`);

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

  // const isLastAssistant =
  //   agent.messages
  //     .filter((m) => m.role === "assistant")
  //     .at(-1)?.id === message.id;
  // console.log(`isLastAssistant: ${isLastAssistant}`);

  // const showLoading =
  //   agent.isRunning &&
  //   isLastAssistant;
  //   // !messageContent &&
  //   // !subComponent;
  // console.log(`showLoading: ${showLoading}`);
  // if (!messageContent && !subComponent && !showLoading) {
  //   return null;
  // }

  return (
    <div key={key} className="flex items-start gap-3 px-4 py-2">
      <div className="flex flex-col gap-2 max-w-[72ch] w-full">
        {messageContent && (
          <div className="prose prose-sm dark:prose-invert">
            <Markdown content={messageContent} />
          </div>
        )}

        {subComponent && <div>{subComponent}</div>}

        {/* {showLoading && (
          <div className="flex items-center gap-1 h-5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" />
          </div>
        )} */}
      </div>
    </div>
  );
}
