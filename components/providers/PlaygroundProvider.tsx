"use client";

import { createContext, useContext, type PropsWithChildren, useState, useEffect } from "react";
import { useAssistants, type AssistantsState } from "@/hooks/useAssistants";
import { useCoAgent } from "@copilotkit/react-core";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
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
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as unknown as Session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as unknown as Session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Shared State
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [toolSelection, setToolSelection] = useState<MCPToolSelection>({
    selectedServers: [],
    selectedTools: [],
    mcpSessions: [],
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
      selectedTools: toolSelection.selectedTools,
      mcpSessions: toolSelection.mcpSessions,
      plan_mode: activeAssistant?.config?.plan_mode || false, // Disable planning by default
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
      selectedTools: agentState.selectedTools,
      mcpSessions: agentState.mcpSessions,
      plan_mode: updatedAssistant?.config?.plan_mode || false,
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
