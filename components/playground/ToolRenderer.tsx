"use client";

import { defineToolCallRenderer } from "@copilotkit/react-core/v2";
import MCPToolCall from "./MCPToolCall";

// Define default renderer for all MCP tool calls
export const ToolRenderer = defineToolCallRenderer({
  name: "*", // Wildcard to match all tools
  render: ({ args, status, result, name }) => {
    // Map status to MCPToolCall expected values
    const toolStatus = (status === "complete" || status === "inProgress" || status === "executing")
      ? status
      : "executing";

    return (
      <MCPToolCall
        status={toolStatus as "complete" | "executing" | "inProgress"}
        name={name}
        args={args}
        result={result}
      />
    );
  },
});

