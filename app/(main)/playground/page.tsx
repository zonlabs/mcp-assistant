"use client";

import {
  useCopilotChatHeadless_c,
} from "@copilotkit/react-core";
import { Message } from "@copilotkit/shared";

import ChatInput from "@/components/playground/ChatInput";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import HumanInTheLoop from "@/components/playground/HumanInTheLoop";
import { ToolRenderer } from "@/components/playground/ToolRenderer";
import { AssistantMessage, UserMessage } from "@/components/playground/ChatMessage";
import { A2AMessageRenderer } from "@/components/playground/a2a/A2AMessageRenderer";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";

/* ---------- INPUT WRAPPER ---------- */

interface ChatInputWrapperProps {
  onSend: (message: Message) => void;
  disabled?: boolean;
}

const ChatInputWrapper = ({ onSend, disabled }: ChatInputWrapperProps) => {
  const { pushToTalkState, setPushToTalkState } = usePushToTalk({
    sendFunction: async (text: string) => {
      const msg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };
      onSend(msg);
      return msg;
    },
  });

  return (
    <ChatInput
      onSendMessage={(text) =>
        onSend({
          id: crypto.randomUUID(),
          role: "user",
          content: text,
        })
      }
      pushToTalkState={pushToTalkState}
      onPushToTalkStateChange={setPushToTalkState}
      // disabled={disabled}
    />
  );
};

/* ---------- PAGE ---------- */

const PlaygroundPage = () => {
  const { activeAssistant } = usePlayground();
  const askMode = activeAssistant?.config?.ask_mode;

  const {
    messages,
    sendMessage,
    isLoading,
    interrupt,
  } = useCopilotChatHeadless_c();

  return (
    <div className="flex h-[calc(100vh-110px)]">
      {/* Sidebar */}
      <PlaygroundSidebar />

      {/* Main Chat Area */}
      <div className="flex-1 max-w-2xl mx-auto px-4 flex flex-col h-full">
        {/* Human-in-the-loop or tools */}
        {interrupt ? <HumanInTheLoop /> : askMode ? <HumanInTheLoop /> : <ToolRenderer />}

        {/* A2A tool registration */}
        <A2AMessageRenderer />

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Hello! I am your MCP assistant. How can I help you today?
            </div>
          )}

             {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">

          {messages.filter((m) => m.role !== "tool").map((message) => (
            // <div
            //   key={message.id}
            //   className="animate-in fade-in duration-150"
            // >
            <>
              {message.role === "user" ? (
                <UserMessage  key={message.id} message={message}/>
              ) : (
                <AssistantMessage key={message.id} message={message} />
              )}
            </>
            // </div>
          ))}

          {isLoading && (
            <div className="text-sm text-muted-foreground">
              Assistant is typing…
            </div>
          )}
        </div>
        </div>

        {/* Input */}
        <div className="pt-2">
          <ChatInputWrapper
            disabled={isLoading}
            onSend={(msg) => sendMessage(msg)}
          />
        </div>
      </div>
    </div>
  );
};

export default PlaygroundPage;