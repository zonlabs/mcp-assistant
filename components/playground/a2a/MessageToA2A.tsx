import React from "react";
import { getAgentStyle, truncateTask } from "./agent-styles";
import { MessageActionRenderProps } from "@/types/a2a";

/**
 * Renders a message from the orchestrator to an A2A agent
 * Shows when orchestrator delegates a task to a specialist agent
 */
export const MessageToA2A: React.FC<MessageActionRenderProps> = ({ status, args }) => {
  console.log(`${status} ${args}: status and args MessageToA2A`)
  // Only render when message is being sent (executing) or has been sent (complete)
  switch (status) {
    case "executing":
    case "complete":
      break;
    default:
      return null;
  }

  const agentStyle = getAgentStyle(args.agentName);
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 my-2 animate-in fade-in slide-in-from-left-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Orchestrator Badge */}
          <div className="flex flex-col items-center">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-700 text-white">
              Orchestrator
            </span>
            <span className="text-[9px] text-gray-500 mt-0.5">MCP Assistant</span>
          </div>

          {/* Arrow */}
          <span className="text-gray-400 text-sm">→</span>

          {/* Target A2A Agent Badge */}
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
        </div>

        {/* Task Description */}
        <span className="text-gray-700 text-sm flex-1 min-w-0 break-words" title={args.task}>
          {truncateTask(args.task)}
        </span>
      </div>
    </div>
  );
};
