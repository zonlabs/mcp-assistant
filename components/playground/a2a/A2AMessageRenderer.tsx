"use client";

import { useCoAgentStateRender, useRenderToolCall } from "@copilotkit/react-core";
import type React from "react";
import { MessageToA2A } from "./MessageToA2A";
import { MessageFromA2A } from "./MessageFromA2A";
import { MessageActionRenderProps } from "@/types/a2a";

export function A2AMessageRenderer() {

    // Render default MCP tool calls
    useRenderToolCall({
        name: "send_message_to_a2a_agent",
        render: (actionRenderProps: MessageActionRenderProps) => {
            return (
                <>
                    {/* MessageToA2A: Shows outgoing message (green box) */}
                    <MessageToA2A {...actionRenderProps} />
                    {/* MessageFromA2A: Shows agent response (blue box) */}
                    <MessageFromA2A {...actionRenderProps} />
                </>
            );
        }
    });

    return null;
}
