"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
} from "lucide-react";
import { PushToTalkState } from "@/hooks/usePushToTalk";
import { useCoAgent } from "@copilotkit/react-core";
import { AgentState, Assistant } from "@/types/mcp";
import { createClient } from "@/lib/supabase/client";
import { Session } from "@supabase/supabase-js";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import { toast } from "react-hot-toast";
import AssistantDropdown from "./AssistantDropdown";
import ModelDropdown from "./ModelDropdown";
import MCPToolsDropdown, { MCPToolSelection } from "./MCPToolsDropdown";
import MicrophoneButton from "./MicrophoneButton";
import AuthDialog from "./dialogs/AuthDialog";
import AssistantDialog, { AssistantFormData } from "./dialogs/AssistantDialog";
import AssistantDeleteDialog from "./dialogs/AssistantDeleteDialog";
import { AVAILABLE_MODELS } from "./availableModels";

interface CustomChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  pushToTalkState?: PushToTalkState;
  onPushToTalkStateChange?: (state: PushToTalkState) => void;
}

export default function ChatInput({
  onSendMessage,
  pushToTalkState = "idle",
  onPushToTalkStateChange
}: CustomChatInputProps) {
  // Generate sessionId for authenticated or anonymous users (browser only)
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  // Fetch assistants and shared state from context
  const {
    assistants,
    activeAssistant,
    setActiveAssistant,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    loading,
    selectedModel,
    setSelectedModel,
    toolSelection,
    setToolSelection,
    agentState: state,
    setAgentState: setState
  } = usePlayground();

  // Helper to get LLM config for assistant updates (still needed for saving)
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

  const [message, setMessage] = useState("");
  const [dropdownState, setDropdownState] = useState<"model" | "assistant" | "mcp" | null>(null);
  const [dialogState, setDialogState] = useState<"auth" | "assistant" | "delete" | null>(null);
  const [assistantDialogMode, setAssistantDialogMode] = useState<"create" | "edit">("create");
  const [editingAssistantId, setEditingAssistantId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [deletingAssistant, setDeletingAssistant] = useState<Assistant | null>(null);
  const [assistantFormData, setAssistantFormData] = useState<AssistantFormData>({
    name: "",
    description: "",
    instructions: "",
    config: {
      ask_mode: false,
      max_tokens: 2000,
      temperature: 0.7,
      datetime_context: true,
    }
  });

  const handleModelChange = (modelId: string) => {
    // Update local state
    setSelectedModel(modelId);
    // Push to coagent state
    setState({ ...state, model: modelId });
    setDropdownState(null);
  };

  const handleAssistantChange = async (assistantId: string) => {
    setIsBusy(true);
    try {
      await setActiveAssistant(assistantId);
      setDropdownState(null);
    } catch (error) {
      console.error("Failed to set active assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleToolSelectionChange = (newSelection: MCPToolSelection) => {
    setToolSelection(newSelection);
    // Update coagent state with selected tools and MCP sessions
    setState({
      ...state,
      selectedTools: newSelection.selectedTools,
      mcpSessions: newSelection.mcpSessions,
    });
  };

  const handleCreateAssistantClick = () => {
    setAssistantDialogMode("create");
    setAssistantFormData({
      name: "",
      description: "",
      instructions: "",
      config: {
        ask_mode: false,
        max_tokens: 2000,
        temperature: 0.7,
        datetime_context: true,
      }
    });
    setDialogState("assistant");
  };

  const handleEditClick = (assistant: Assistant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the assistant
    setAssistantDialogMode("edit");
    setEditingAssistantId(assistant.id);
    setAssistantFormData({
      name: assistant.name,
      description: assistant.description || "",
      instructions: assistant.instructions,
      config: {
        ask_mode: assistant.config?.ask_mode || false,
        max_tokens: assistant.config?.max_tokens || 2000,
        temperature: assistant.config?.temperature || 0.7,
        datetime_context: assistant.config?.datetime_context !== undefined ? assistant.config.datetime_context : true,
        llm_provider: assistant.config?.llm_provider,
        llm_api_key: assistant.config?.llm_api_key,
        llm_name: assistant.config?.llm_name,
      }
    });
    setDropdownState(null);
    setDialogState("assistant");
  };

  const handleSubmitAssistant = async (saveApiKey: boolean) => {
    if (!assistantFormData.name.trim() || !assistantFormData.instructions.trim()) {
      toast.error("Name and instructions are required");
      return;
    }
    setIsBusy(true);
    try {
      // Handle API key storage based on checkbox
      const configToSave = { ...assistantFormData.config };

      if (!saveApiKey) {
        // Save to localStorage JSON only
        if (configToSave.llm_api_key && configToSave.llm_provider) {
          localStorage.setItem('llm_config', JSON.stringify({
            llm_provider: configToSave.llm_provider,
            llm_api_key: configToSave.llm_api_key
          }));
        }
        // Don't send API key or provider to database
        configToSave.llm_api_key = undefined;
        configToSave.llm_provider = undefined;
      } else {
        // Save to database - API key and provider will be sent as-is
        // Clear from localStorage
        localStorage.removeItem('llm_config');
      }

      if (assistantDialogMode === "create") {
        await createAssistant({
          name: assistantFormData.name,
          instructions: assistantFormData.instructions,
          description: assistantFormData.description || undefined,
          isActive: true, // Make new assistant active by default
          config: configToSave,
        });
      } else {
        // Edit mode
        if (editingAssistantId) {
          await updateAssistant(editingAssistantId, {
            name: assistantFormData.name,
            instructions: assistantFormData.instructions,
            description: assistantFormData.description || undefined,
            config: configToSave,
          });
        }
      }

      // Update agent state with new LLM config after save
      if (activeAssistant) {
        // Use the values we just saved (from DB or localStorage)
        let llm_provider: string | undefined;
        let llm_api_key: string | undefined;

        if (saveApiKey) {
          // Saved to DB - use the original values from form
          llm_provider = assistantFormData.config.llm_provider;
          llm_api_key = assistantFormData.config.llm_api_key;
        } else {
          // Saved to localStorage - read from there
          const llmConfig = getLLMConfig();
          llm_provider = llmConfig.provider;
          llm_api_key = llmConfig.apiKey;
        }

        setState({
          ...state,
          assistant: {
            ...activeAssistant,
            config: {
              ...activeAssistant.config,
              llm_provider,
              llm_api_key,
            }
          }
        });
      }

      handleCancelAssistant();
    } catch (error) {
      console.error(`Failed to ${assistantDialogMode} assistant:`, error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCancelAssistant = () => {
    setDialogState(null);
    setEditingAssistantId(null);
    setAssistantFormData({
      name: "",
      description: "",
      instructions: "",
      config: {
        ask_mode: false,
        max_tokens: 2000,
        temperature: 0.7,
        datetime_context: true,
      }
    });
  };

  const handleDeleteClick = (assistant: Assistant, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting the assistant
    setDeletingAssistant(assistant);
    setDropdownState(null);
    setDialogState("delete");
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssistant) return;
    setIsBusy(true);
    try {
      await deleteAssistant(deletingAssistant.id);
      setDialogState(null);
      setDeletingAssistant(null);
    } catch (error) {
      console.error("Failed to delete assistant:", error);
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendMessage = () => {
    if (!session) {
      setDialogState("auth");
      return;
    }

    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine which models to show in the dropdown
  const modelsToShow = React.useMemo(() => {
    const customLlmName = activeAssistant?.config?.llm_name;
    if (customLlmName && customLlmName.trim()) {
      // Show only the specified LLM
      return [{
        id: customLlmName,
        name: customLlmName,
        description: `Model configured for ${activeAssistant.name}`,
        provider: activeAssistant?.config?.llm_provider || "OpenAI",
        tag: "Configured"
      }];
    }
    // Show default models
    return AVAILABLE_MODELS;
  }, [activeAssistant]);

  // Auto-select model based on assistant configuration
  React.useEffect(() => {
    const customLlmName = activeAssistant?.config?.llm_name;

    if (customLlmName && customLlmName.trim()) {
      // Assistant has custom llm_name, switch to it
      if (selectedModel !== customLlmName) {
        setSelectedModel(customLlmName);
      }
    } else {
      // Assistant doesn't have llm_name, ensure we're using a default model
      const isSelectedModelInDefaults = AVAILABLE_MODELS.some(m => m.id === selectedModel);
      if (!isSelectedModelInDefaults) {
        // Current model is not in defaults, reset to first default model
        const defaultModel = AVAILABLE_MODELS[0]?.id;
        if (defaultModel) {
          setSelectedModel(defaultModel);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAssistant?.id, activeAssistant?.config?.llm_name]);

  return (
    <>
      <AuthDialog open={dialogState === "auth"} onOpenChange={v => setDialogState(v ? "auth" : null)} />
      <AssistantDialog
        mode={assistantDialogMode}
        open={dialogState === "assistant"}
        onOpenChange={v => setDialogState(v ? "assistant" : null)}
        formData={assistantFormData}
        setFormData={setAssistantFormData}
        onSubmit={handleSubmitAssistant}
        loading={isBusy}
        handleCancel={handleCancelAssistant}
      />
      <AssistantDeleteDialog
        open={dialogState === "delete"}
        onOpenChange={v => setDialogState(v ? "delete" : null)}
        assistant={deletingAssistant}
        loading={isBusy}
        onDelete={handleConfirmDelete}
        onCancel={() => { setDialogState(null); setDeletingAssistant(null); }}
      />

      <div className="w-full px-2 sm:px-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-gray-400 dark:border-zinc-700 shadow-xl hover:border-gray-500 dark:hover:border-zinc-600 transition-colors">
          {/* Parent container with two children */}
          <div className="flex flex-col">
            {/* First child: Textarea for prompt */}
            <div className="flex-1 px-2 sm:px-2 pt-2 sm:pt-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your prompt..."
                className="w-full resize-none bg-transparent border-0 outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-[15px] leading-relaxed scrollbar-minimal"
                rows={1}
                style={{
                  minHeight: '50px',
                  maxHeight: '100px',
                  overflowY: 'auto'
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  const newHeight = Math.min(target.scrollHeight, 120);
                  target.style.height = newHeight + 'px';
                }}
              />
            </div>

            {/* Second child: MCP button, assistant, model, send button, etc. */}
            <div className="flex items-center justify-between gap-2 px-2 sm:px-2 pb-2 sm:pb-2">
              {/* Left side: MCP button */}
              <div className="flex items-center gap-2">
                <MCPToolsDropdown
                  selection={toolSelection}
                  onSelectionChange={handleToolSelectionChange}
                  showDropdown={dropdownState === "mcp"}
                  setShowDropdown={(open) => setDropdownState(open ? "mcp" : null)}
                />
              </div>

              {/* Right side: Assistant, Model, Microphone, Send */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Assistant Selection Dropdown */}
                {session && (
                  <AssistantDropdown
                    session={session}
                    assistants={assistants || []}
                    activeAssistant={activeAssistant}
                    isBusy={isBusy}
                    loading={loading}
                    showAssistantDropdown={dropdownState === "assistant"}
                    setShowAssistantDropdown={(open) => setDropdownState(open ? "assistant" : null)}
                    handleAssistantChange={handleAssistantChange}
                    handleEditClick={handleEditClick}
                    handleDeleteClick={handleDeleteClick}
                    handleCreateAssistantClick={handleCreateAssistantClick}
                  />
                )}

                {/* Model Selection Dropdown */}
                <ModelDropdown
                  selectedModel={selectedModel}
                  setShowModelDropdown={(open) => setDropdownState(open ? "model" : null)}
                  showModelDropdown={dropdownState === "model"}
                  AVAILABLE_MODELS={modelsToShow}
                  handleModelChange={handleModelChange}
                />

                {/* Microphone Button */}
                {onPushToTalkStateChange && (
                  <MicrophoneButton
                    pushToTalkState={pushToTalkState as string}
                    onPushToTalkStateChange={typeof onPushToTalkStateChange === 'function' ? ((s) => onPushToTalkStateChange(s as PushToTalkState)) : undefined}
                    session={session}
                    disabled={isBusy}
                    setShowAuthDialog={() => setDialogState("auth")}
                  />
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black disabled:bg-gray-300 dark:disabled:bg-zinc-700 disabled:opacity-50
                           text-white rounded-lg p-1.5 sm:p-2 h-7 w-7 sm:h-8 sm:w-8 flex items-center justify-center
                           transition-all duration-200 shadow-lg cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}