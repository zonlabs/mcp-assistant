"use client";

import React from "react";
import { useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { Message } from "@copilotkit/shared";

// Existing Imports
import ChatInput from "@/components/playground/ChatInput";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import HumanInTheLoop from "@/components/playground/HumanInTheLoop";
import { ToolRenderer } from "@/components/playground/ToolRenderer";
import { AssistantMessage, UserMessage } from "@/components/playground/ChatMessage";
import { A2AMessageRenderer } from "@/components/playground/a2a/A2AMessageRenderer";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";

// Assuming you are importing your recipe component here
import { RecipeComponent } from "@/components/playground/RecipeComponent"; 

/* ---------- INPUT WRAPPER ---------- */

const ChatInputWrapper = ({ onSend, disabled }: { onSend: (message: Message) => void; disabled?: boolean }) => {
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
      disabled={disabled}
    />
  );
};

/* ---------- MAIN PAGE ---------- */

const PlaygroundPage = () => {
  const { activeAssistant } = usePlayground();
  const askMode = activeAssistant?.config?.ask_mode;

  const { messages, sendMessage, isLoading, interrupt } = useCopilotChatHeadless_c();

  // Helper to trigger prompts from the grid
  const handleAction = (promptText: string) => {
    sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: promptText,
    });
  };

  const isChatEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-110px)] bg-[#0a0a0a] text-zinc-200">
      <PlaygroundSidebar />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          <div className={`mx-auto px-4 w-full transition-all duration-700 ease-in-out 
            ${isChatEmpty 
                ? 'max-w-4xl flex flex-col items-center justify-center min-h-[85vh]' 
                : 'max-w-2xl py-10'
            }`}>

            {/* --- EMPTY STATE VIEW --- */}
            {isChatEmpty && (
              <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <h1 className="text-4xl md:text-5xl font-serif text-center text-zinc-100 tracking-tight">
                I’m here — let’s talk it through
                </h1>

                {/* Centered Input for Landing */}
                <div className="max-w-2xl mx-auto w-full shadow-2xl">
                  <ChatInputWrapper onSend={(msg) => sendMessage(msg)} disabled={isLoading} />
                </div>

                {/* Imported Recipe Component */}
                <RecipeComponent onAction={handleAction} />
              </div>
            )}

            {/* --- ACTIVE CHAT VIEW --- */}
            {!isChatEmpty && (
              <div className="space-y-8">
                {/* Plugin UI / HITL */}
                <div className="space-y-4">
                    {interrupt ? <HumanInTheLoop /> : askMode ? <HumanInTheLoop /> : <ToolRenderer />}
                    <A2AMessageRenderer />
                </div>

                {/* Filter out tool messages and render history */}
                <div className="space-y-6">
                  {messages.filter((m) => m.role !== "tool").map((message) => (
                    <div key={message.id} className="animate-in fade-in duration-500">
                      {message.role === "user" ? (
                        <UserMessage message={message} />
                      ) : (
                        <AssistantMessage message={message} />
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-3 px-4 text-sm text-zinc-500">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></div>
                      </div>
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- STICKY BOTTOM INPUT --- */}
        {/* Only visible when chat has started */}
        {!isChatEmpty && (
          <div className="p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent">
            <div className="max-w-2xl mx-auto">
              <ChatInputWrapper
                disabled={isLoading}
                onSend={(msg) => sendMessage(msg)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PlaygroundPage;