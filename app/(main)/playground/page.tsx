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
import { A2AMessageRenderer } from "@/components/playground/a2a/A2AMessageRenderer";
import { PlaygroundSidebar } from "@/components/playground/PlaygroundSidebar";

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

  const { activeAssistant } = usePlayground();
  const askMode = activeAssistant?.config?.ask_mode;

  return (
    <div className="flex h-[calc(100vh-110px)]">
      {/* Sidebar */}
      <PlaygroundSidebar />

      {/* Main Chat Area */}
      <div
        className="flex-1 max-w-2xl mx-auto px-4 flex flex-col h-full"
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
          className="flex-1 min-h-0 rounded-md"
          Input={ChatInputWrapper}
          AssistantMessage={AssistantMessage}
        />
      </div>
    </div>
  );
};

export default PlaygroundPage;
