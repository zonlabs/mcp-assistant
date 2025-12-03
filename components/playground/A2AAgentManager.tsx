"use client";
import { useState } from "react";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import { Assistant } from "@/types/mcp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, CheckCircle2, AlertCircle, Zap, Shield, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

type A2AAgentInfo = {
  name: string;
  description: string;
  url: string;
};

export function A2AAgentManager() {
  const { activeAssistant, updateAssistant, refresh } = usePlayground();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [agentUrl, setAgentUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Get existing a2a_agents from active assistant's config
  const existingAgents: A2AAgentInfo[] =
    (activeAssistant?.config as any)?.a2a_agents || [];

  const handleValidateAndSave = async () => {
    if (!agentUrl.trim()) {
      toast.error("Agent URL is required");
      return;
    }

    try {
      // Validate URL format
      new URL(agentUrl);

      setIsValidating(true);

      // Validate agent URL via backend
      const toastId = toast.loading("Validating agent URL...");
      const validationResponse = await fetch("/api/a2a/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentUrl }),
      });

      const validationResult = await validationResponse.json();
      toast.dismiss(toastId);

      if (!validationResponse.ok || !validationResult.success) {
        toast.error(validationResult.error || "Failed to validate agent URL");
        setIsValidating(false);
        return;
      }

      // Extract agent info from validated agent card
      const agentCard = validationResult.agentCard;
      const agentName = agentCard?.name || "Unknown Agent";
      const agentDescription = agentCard?.description || "";

      toast.success(`Agent validated: ${agentName}`);

      // Check if agent already exists (by URL)
      const updatedAgents = [...existingAgents];
      const existingIdx = updatedAgents.findIndex(a => a.url === agentUrl);

      const newAgent: A2AAgentInfo = {
        name: agentName,
        description: agentDescription,
        url: agentUrl,
      };

      if (existingIdx !== -1) {
        // Update existing agent
        updatedAgents[existingIdx] = newAgent;
      } else {
        // Add new agent
        updatedAgents.push(newAgent);
      }

      // Update assistant config with validated agents
      if (!activeAssistant) {
        toast.error("No active assistant selected");
        setIsValidating(false);
        return;
      }

      await updateAssistant(activeAssistant.id, {
        config: {
          ...(activeAssistant.config as any),
          a2a_agents: updatedAgents,
        },
      });

      setAgentUrl("");
      setIsAddDialogOpen(false);
      setIsValidating(false);
      toast.success("A2A agent saved successfully");
      await refresh();
    } catch (error) {
      setIsValidating(false);
      if (error instanceof TypeError) {
        toast.error("Invalid URL format");
      } else {
        toast.error("Failed to add A2A agent");
      }
    }
  };

  const handleDeleteAgent = async (agentUrl: string) => {
    if (!activeAssistant) return;

    const agentToDelete = existingAgents.find(a => a.url === agentUrl);
    if (!agentToDelete) return;

    if (confirm(`Are you sure you want to remove ${agentToDelete.name}?`)) {
      try {
        const updatedAgents = existingAgents.filter(a => a.url !== agentUrl);

        await updateAssistant(activeAssistant.id, {
          config: {
            ...(activeAssistant.config as any),
            a2a_agents: updatedAgents,
          },
        });

        toast.success("A2A agent removed");
        await refresh();
      } catch (error) {
        toast.error("Failed to remove A2A agent");
      }
    }
  };

  const testConnection = async (agent: A2AAgentInfo) => {
    const toastId = toast.loading(`Testing connection to ${agent.name}...`);

    try {
      // Use backend proxy to validate agent
      const validationResponse = await fetch("/api/a2a/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentUrl: agent.url }),
      });

      const validationResult = await validationResponse.json();
      toast.dismiss(toastId);

      if (validationResponse.ok && validationResult.success) {
        const agentCard = validationResult.agentCard;
        const agentName = agentCard?.name || agent.name;
        const agentDescription = agentCard?.description || '';
        const agentVersion = agentCard?.version || '';
        const capabilities = agentCard?.capabilities || {};

        toast.success(
          <div className="space-y-1">
            <div className="font-semibold">{agentName} is online!</div>
            {agentDescription && (
              <div className="text-xs text-gray-600">{agentDescription}</div>
            )}
            <div className="text-xs text-gray-500">
              {agentVersion ? `Version: ${agentVersion}` : 'A2A Agent'} | {capabilities.streaming ? 'Streaming ✓' : ''}
            </div>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(validationResult.error || `Failed to connect to ${agent.name}`);
      }
    } catch (error) {
      toast.dismiss(toastId);
      toast.error(`Cannot reach ${agent.name}: ${error instanceof Error ? error.message : 'Connection failed'}`);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">A2A Agents</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={!activeAssistant}>
              <Plus className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add A2A Agent</DialogTitle>
              <DialogDescription>
                Enter the agent URL to validate and connect to a remote A2A agent
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="url">Agent URL *</Label>
                <Input
                  id="url"
                  placeholder="http://localhost:9001"
                  value={agentUrl}
                  onChange={(e) => setAgentUrl(e.target.value)}
                  disabled={isValidating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Agent name and description will be fetched automatically after validation
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setAgentUrl("");
                }}
                disabled={isValidating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidateAndSave}
                disabled={isValidating || !agentUrl.trim()}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Validate & Save"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* A2A Agents List */}
      <div className="space-y-3">
        {!activeAssistant ? (
          <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
            No active assistant selected. Please select or create an assistant first.
          </div>
        ) : existingAgents.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8 border rounded-lg border-dashed">
            No A2A agents configured for this assistant. Add one to enable agent-to-agent delegation.
          </div>
        ) : (
          existingAgents.map((agent: A2AAgentInfo) => {
            return (
              <div
                key={agent.url}
                className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-all bg-card"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    {/* Agent name and status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <h4 className="font-semibold text-base">{agent.name}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Validated
                      </span>
                    </div>

                    {/* Description */}
                    {agent.description && (
                      <p className="text-sm text-muted-foreground">
                        {agent.description}
                      </p>
                    )}

                    {/* URL and Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                        {agent.url}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnection(agent)}
                        className="text-xs h-7"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Test
                      </Button>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteAgent(agent.url)}
                    className="ml-2"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
