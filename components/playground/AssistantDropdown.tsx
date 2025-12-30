import { Bot, ChevronDown, Loader2, Plus, Pencil, X } from "lucide-react";
import React from "react";
import { Session } from "@supabase/supabase-js";
import type { Assistant } from "@/types/mcp";

export interface AssistantDropdownProps {
  session: Session | null;
  assistants: Assistant[];
  activeAssistant: Assistant | null;
  isBusy: boolean;
  loading?: boolean;
  showAssistantDropdown: boolean;
  setShowAssistantDropdown: (v: boolean) => void;
  handleAssistantChange: (assistantId: string) => void;
  handleEditClick: (assistant: Assistant, e: React.MouseEvent) => void;
  handleDeleteClick: (assistant: Assistant, e: React.MouseEvent) => void;
  handleCreateAssistantClick: () => void;
}

const AssistantDropdown: React.FC<AssistantDropdownProps> = ({
  session,
  assistants,
  activeAssistant,
  isBusy,
  loading,
  showAssistantDropdown,
  setShowAssistantDropdown,
  handleAssistantChange,
  handleEditClick,
  handleDeleteClick,
  handleCreateAssistantClick
}) => {
  if (!session) return null;
  return (
    <div className="relative mr-1 sm:mr-2">
      {loading ? "" : (
        <button
          onClick={() => setShowAssistantDropdown(!showAssistantDropdown)}
          className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700/50 rounded transition-all duration-200 cursor-pointer"
        >
          <Bot className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
          {isBusy && <Loader2 className="w-3 h-3.5 ml-1 animate-spin text-gray-500 dark:text-gray-300" />}
          <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[80px] sm:max-w-none">
            {(activeAssistant?.name || "Default")}
          </span>
          <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0 ${showAssistantDropdown ? 'rotate-180' : ''}`} />
        </button>
      )}
      {showAssistantDropdown && (
        <>
          <div className="absolute bottom-full mb-2 right-0 md:right-0 left-0 md:left-auto bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-700/50 rounded-2xl shadow-2xl backdrop-blur-xl z-50 w-full md:min-w-[300px] md:max-w-[360px] max-h-[50vh] overflow-hidden">
            {/* Assistants List */}
            <div className="overflow-y-auto max-h-[calc(50vh-60px)] scrollbar-minimal px-1">
              <div className="p-2">
                {assistants && assistants.length > 0 ? (
                  assistants.map((assistant) => (
                    <button
                      key={assistant.id}
                      onClick={() => handleAssistantChange(assistant.id)}
                      className={`w-full group relative flex flex-col px-3 sm:px-4 py-2.5 sm:py-3 text-left transition-all duration-150 rounded-lg cursor-pointer
                        ${activeAssistant?.id === assistant.id
                          ? 'bg-gray-200 dark:bg-zinc-700 border-2 border-gray-600 dark:border-zinc-400 z-10'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 border-2 border-transparent'}`}
                      disabled={isBusy}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-gray-600 dark:text-gray-400" />
                          <span className={`text-[11px] sm:text-xs font-medium ${activeAssistant?.id === assistant.id ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>{assistant.name}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => handleEditClick(assistant, e)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors cursor-pointer"
                            title="Edit assistant"
                            disabled={isBusy}
                          >
                            <Pencil className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(assistant, e)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer"
                            title="Delete assistant"
                            disabled={isBusy}
                          >
                            <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </div>
                      {/* Description */}
                      {assistant.description && (
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed ml-5">
                          {assistant.description}
                        </p>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-3 sm:px-4 py-6 text-center">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No assistants yet
                    </p>
                  </div>
                )}
              </div>
            </div>
            {/* Create New Assistant Button */}
            <div className="border-t border-gray-200 dark:border-zinc-700 p-2">
              <button
                onClick={() => {
                  setShowAssistantDropdown(false);
                  handleCreateAssistantClick();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-[11px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-all duration-150 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Create New Assistant
              </button>
            </div>
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAssistantDropdown(false)}
          />
        </>
      )}
    </div>
  );
};

export default AssistantDropdown;
