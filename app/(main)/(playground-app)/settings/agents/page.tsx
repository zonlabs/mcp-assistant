"use client";

import { A2AAgentManager } from "@/components/playground/A2AAgentManager";

export default function AgentsPage() {
  return (
    <div className="pl-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">A2A Agents</h1>
        <p className="text-sm text-muted-foreground">
          Manage Agent-to-Agent protocol connections
        </p>
      </div>

      {/* Experimental Note */}
      <div className="rounded-md border border-dashed bg-accent/20 p-3 text-xs text-muted-foreground mb-6">
        <strong>Experimental:</strong> A2A protocol support is still in progress.
        Feel free to test interactions with open remote agents that implement the A2A standard.
      </div>

      <A2AAgentManager />
    </div>
  );
}
