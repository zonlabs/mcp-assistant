"use client";

import React from "react";
import { useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { Message } from "@copilotkit/shared";
import { cn } from "@/lib/utils";

// Existing Imports
import ChatInput from "@/components/playground/ChatInput";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import HumanInTheLoop from "@/components/playground/HumanInTheLoop";
import { ToolRenderer } from "@/components/playground/ToolRenderer";
import { AssistantMessage, UserMessage } from "@/components/playground/ChatMessage";
import { A2AMessageRenderer } from "@/components/playground/a2a/A2AMessageRenderer";

// Assuming you are importing your recipe component here
import { RecipeComponent } from "@/components/playground/RecipeComponent";
import { useAgent } from "@copilotkit/react-core/v2";
import { TimeDisplay } from "@/components/playground/TimeDisplay";
import { LoadingSpinner } from "@/components/playground/LoadingSpinner";

/* ---------- INPUT WRAPPER ---------- */

const ChatInputWrapper = ({
  onSend,
  disabled,
  onStop,
  isGenerating
}: {
  onSend: (message: Message) => void;
  disabled?: boolean;
  onStop?: () => void;
  isGenerating?: boolean;
}) => {
  const { pushToTalkState, setPushToTalkState } = usePushToTalk({
    sendFunction: async (text: string) => {
      const msg: Message = { id: crypto.randomUUID(), role: "user", content: text };
      onSend(msg);
      return msg;
    },
  });

  return (
    <ChatInput
      onSendMessage={(text) => onSend({ id: crypto.randomUUID(), role: "user", content: text })}
      pushToTalkState={pushToTalkState}
      onPushToTalkStateChange={setPushToTalkState}
      onStop={onStop}
      isGenerating={isGenerating}
      // disabled={disabled}
    />
  );
};

/* ---------- MAIN PAGE ---------- */

const PlaygroundPage = () => {
  const { activeAssistant } = usePlayground();
  const { agent } = useAgent({agentId: 'mcpAssistant'});
  const askMode = activeAssistant?.config?.ask_mode;

  const { messages, sendMessage, isLoading, interrupt, stopGeneration } = useCopilotChatHeadless_c();

  // Calculate isChatEmpty early
  const isChatEmpty = messages.length === 0;

  // Refs for auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current && !isChatEmpty) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, agent?.isRunning, isChatEmpty]);

  // Helper to trigger prompts from the grid
  const handleAction = (promptText: string) => {
    sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: promptText,
    });
  };

  return (
    <>
      {/* Header with Date, Time, and Language */}
      <TimeDisplay />

      {/* Scrollable Container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex-1 overflow-y-auto custom-scrollbar",
          isChatEmpty && "flex items-center justify-center"
        )}>

        <div className={`mx-auto px-3 sm:px-4 md:px-6 w-full transition-all duration-700 ease-in-out
          ${isChatEmpty
              ? 'max-w-4xl'
              : 'max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl py-6 sm:py-10'
          }`}>

          {/* --- EMPTY STATE VIEW --- */}
          {isChatEmpty && (
            <div className="w-full space-y-3 sm:space-y-6 md:space-y-8 lg:space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif text-center text-foreground tracking-tight px-2 sm:px-4 md:px-6 lg:px-8 break-words leading-tight">
              I'm here — let's talk it through
              </h1>

              {/* Centered Input for Landing */}
              <div className="max-w-full sm:max-w-lg md:max-w-2xl mx-auto w-full">
                <ChatInputWrapper
                  onSend={(msg) => sendMessage(msg)}
                  disabled={isLoading}
                  onStop={stopGeneration}
                  isGenerating={agent?.isRunning}
                />
              </div>

              {/* Imported Recipe Component */}
              <RecipeComponent onAction={handleAction} />
            </div>
          )}

          {/* --- ACTIVE CHAT VIEW --- */}
          {!isChatEmpty && (
            <div className="space-y-4 sm:space-y-6 md:space-y-8">
              {/* Plugin UI / HITL */}
              <div className="space-y-3 sm:space-y-4">
                  {interrupt ? <HumanInTheLoop /> : askMode ? <HumanInTheLoop /> : <ToolRenderer />}
                  <A2AMessageRenderer />
              </div>

              {/* Filter out tool messages and render history */}
              <div className="space-y-4 sm:space-y-6">

                {messages.filter((m) => m.role !== "tool").map((message, index, filteredMessages) => {
                  // Check if this is the last assistant message
                  const isLastAssistantMessage =
                    message.role === "assistant" &&
                    index === filteredMessages.map(m => m.role === "assistant" ? m.id : null).lastIndexOf(message.id);

                  return (
                    <div key={message.id} className="animate-in fade-in duration-500">
                      {message.role === "user" ? (
                        <UserMessage message={message} />
                      ) : (
                        <AssistantMessage message={message} showReasoning={isLastAssistantMessage} />
                      )}
                    </div>
                  );
                })}

                {agent?.isRunning && <LoadingSpinner />}

                {/* Auto-scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- STICKY BOTTOM INPUT --- */}
      {/* Only visible when chat has started */}
      {!isChatEmpty && (
        <div className="p-3 sm:p-4 md:p-6 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-full sm:max-w-lg md:max-w-2xl lg:max-w-2xl mx-auto">
            <ChatInputWrapper
              disabled={isLoading}
              onSend={(msg) => sendMessage(msg)}
              onStop={stopGeneration}
              isGenerating={agent?.isRunning}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default PlaygroundPage;
