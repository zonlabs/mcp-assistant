"use client";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import ChatInput from "../../components/playground/ChatInput";
import { usePushToTalk } from "@/hooks/usePushToTalk";
import { Message } from "@copilotkit/shared";
import { CopilotKitCSSProperties } from "@copilotkit/react-ui";
import HumanInTheLoop from "@/components/playground/HumanInTheLoop";
import { ToolRenderer } from "@/components/playground/ToolRenderer";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import { AssistantMessage } from "@/components/playground/ChatMessage";
import { A2AAgentManager } from "@/components/playground/A2AAgentManager";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { A2AMessageRenderer } from "@/components/playground/a2a/A2AMessageRenderer";

interface ChatInputWrapperProps {
  onSend: (message: string) => void;
}

const ChatInputWrapper = ({ onSend }: ChatInputWrapperProps) => {
  const { pushToTalkState, setPushToTalkState } = usePushToTalk({
    sendFunction: async (text: string) => {
      onSend(text);
      return { id: Date.now().toString(), content: text, role: "user" } as Message;
    },
  });
  return (
    <div className="w-full">
      <ChatInput
        onSendMessage={onSend}
        pushToTalkState={pushToTalkState}
        onPushToTalkStateChange={setPushToTalkState}
      />
    </div>
  );
};

const PlaygroundPage = () => {
  const { activeAssistant, agentState } = usePlayground();
  const askMode = activeAssistant?.config?.ask_mode;
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  console.log('agentstate:', agentState)
  // Extract A2A agents from active assistant config
  // const a2aAgents = (activeAssistant?.config as any)?.a2a_agents || null;

  return (
    <div className="flex h-[calc(100vh-64px)] gap-4">
      {/* A2A Agent Manager Sidebar */}
      <div
        className={`transition-all duration-300 ${isSidebarOpen ? "w-80" : "w-0"
          } overflow-hidden`}
      >
        {isSidebarOpen && (
          <div className="h-full border-r pr-4 overflow-y-auto">
            <A2AAgentManager />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed left-4 top-20 z-10 p-2 rounded-md bg-background border shadow-md hover:bg-accent"
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      {/* Main Chat Area */}
      <div
        className="flex-1 max-w-2xl mx-auto"
        style={
          {
            "--copilot-kit-background-color": "var(--background)",
          } as CopilotKitCSSProperties
        }
      >
        {/* Human-in-the-loop or tool renderer */}
        {(askMode) ? <HumanInTheLoop /> : <ToolRenderer />}

        {/* A2A Message Renderer - Registers tool renderer for send_message_to_a2a_agent */}
        <A2AMessageRenderer />

        <CopilotChat
          labels={{
            initial: "Hello! I am your MCP assistant. How can I help you today?",
            title: "MCP Playground",
            placeholder: "Ask about your connected servers...",
          }}
          className="h-[84vh] rounded-md"
          Input={ChatInputWrapper}
          AssistantMessage={AssistantMessage}
        />
      </div>
    </div>
  );
};

export default PlaygroundPage;
