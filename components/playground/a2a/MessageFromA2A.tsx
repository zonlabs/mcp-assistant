import React from "react";
import { getAgentStyle } from "./agent-styles";
import { MessageActionRenderProps } from "@/types/a2a";

/**
 * Renders a response from an A2A agent back to the orchestrator
 * Shows when a specialist agent has completed a delegated task
 */
export const MessageFromA2A: React.FC<MessageActionRenderProps> = ({ status, args }) => {
  // Only render when we have a complete response
  switch (status) {
    case "complete":
      break;
    default:
      return null;
  }

  const agentStyle = getAgentStyle(args.agentName);

  return (
    <div className="my-2 animate-in fade-in slide-in-from-right-5 duration-300">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-[200px] flex-shrink-0">
            {/* Source A2A Agent Badge */}
            <div className="flex flex-col items-center">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${agentStyle.bgColor} ${agentStyle.textColor} ${agentStyle.borderColor} flex items-center gap-1`}
              >
                <span>{agentStyle.icon}</span>
                <span>{args.agentName}</span>
              </span>
              {agentStyle.framework && (
                <span className="text-[9px] text-gray-500 mt-0.5">{agentStyle.framework}</span>
              )}
            </div>

            {/* Arrow */}
            <span className="text-gray-400 text-sm">→</span>

            {/* Orchestrator Badge */}
            <div className="flex flex-col items-center">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700 text-white">
                Orchestrator
              </span>
              <span className="text-[9px] text-gray-500 mt-0.5">MCP Assistant</span>
            </div>
          </div>

          {/* Status Indicator */}
          <span className="text-xs text-gray-600 flex items-center gap-1">
            <span className="text-green-600">✓</span>
            Response received
          </span>
        </div>
      </div>
    </div>
  );
};
