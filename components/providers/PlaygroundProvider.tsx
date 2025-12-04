"use client";
import { createContext, useContext, type PropsWithChildren, useState, useEffect } from "react";
import { useAssistants, type AssistantsState } from "@/hooks/useAssistants";
import { useCoAgent } from "@copilotkit/react-core";
import { useSession } from "next-auth/react";
import { Session } from "next-auth";
import { AgentState, McpConfig } from "@/types/mcp";
import { MCPToolSelection } from "@/components/playground/MCPToolsDropdown";

interface PlaygroundContextType extends AssistantsState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  toolSelection: MCPToolSelection;
  setToolSelection: (selection: MCPToolSelection) => void;
  agentState: AgentState;
  setAgentState: (state: AgentState) => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(
  undefined
);

export function PlaygroundProvider({ children }: PropsWithChildren) {
  const assistantState = useAssistants();
  const { activeAssistant } = assistantState;
  const { data: session } = useSession();

  // Shared State
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [toolSelection, setToolSelection] = useState<MCPToolSelection>({
    selectedServers: [],
    selectedTools: [],
    mcpConfig: {},
  });

  // Helper functions
  const getSessionId = (session: Session | null) => {
    if (typeof window === "undefined") return undefined;

    const sessionId = localStorage.getItem("copilotkit-session");

    if (session?.user?.email) {
      // Authenticated user
      const email = session.user.email;
      const derivedId = email.endsWith("@gmail.com")
        ? email.replace(/@gmail\.com$/, "")
        : email;
      localStorage.setItem("copilotkit-session", derivedId);
      return derivedId;

    } else {
      // Anonymous user
      if (!sessionId) {
        const randomId = crypto.randomUUID();
        localStorage.setItem("copilotkit-session", randomId);
        return randomId;
      }
      return sessionId;
    }
  };

  const getLLMConfig = () => {
    if (typeof window === "undefined") return { provider: undefined, apiKey: undefined };

    // If assistant has config in DB, use it
    if (activeAssistant?.config?.llm_api_key && activeAssistant?.config?.llm_provider) {
      return {
        provider: activeAssistant.config.llm_provider,
        apiKey: activeAssistant.config.llm_api_key,
      };
    }

    // Otherwise, get from localStorage JSON
    const storedConfig = localStorage.getItem('llm_config');
    if (storedConfig) {
      try {
        const config = JSON.parse(storedConfig);
        return {
          provider: config.llm_provider,
          apiKey: config.llm_api_key,
        };
      } catch (e) {
        console.error('Failed to parse llm_config from localStorage:', e);
      }
    }

    return { provider: undefined, apiKey: undefined };
  };

  // CoAgent Hook
  const { state: agentState, setState: setAgentState } = useCoAgent<AgentState>({
    name: "mcpAssistant",
    initialState: {
      model: selectedModel,
      status: undefined,
      sessionId: getSessionId(session),
      assistant: activeAssistant ? {
        ...activeAssistant,
        config: {
          ...activeAssistant.config,
          llm_provider: getLLMConfig().provider || activeAssistant.config?.llm_provider,
          llm_api_key: getLLMConfig().apiKey || activeAssistant.config?.llm_api_key,
        }
      } : null,
      mcp_config: toolSelection.mcpConfig,
      selectedTools: toolSelection.selectedTools,
    },
  });

  // Update coagent state when active assistant changes
  useEffect(() => {
    const llmConfig = getLLMConfig();
    const updatedAssistant = activeAssistant ? {
      ...activeAssistant,
      config: {
        ...activeAssistant.config,
        llm_provider: llmConfig.provider || activeAssistant.config?.llm_provider,
        llm_api_key: llmConfig.apiKey || activeAssistant.config?.llm_api_key,
      }
    } : null;

    setAgentState({
      model: selectedModel,
      status: agentState.status,
      sessionId: agentState.sessionId,
      assistant: updatedAssistant,
      mcp_config: agentState.mcp_config,
      selectedTools: agentState.selectedTools,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssistant]);

  return (
    <PlaygroundContext.Provider value={{
      ...assistantState,
      selectedModel,
      setSelectedModel,
      toolSelection,
      setToolSelection,
      agentState,
      setAgentState
    }}>
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground() {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error(
      "usePlayground must be used within a PlaygroundProvider"
    );
  }
  return context;
}
