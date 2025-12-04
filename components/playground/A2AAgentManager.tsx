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
import { Plus, Trash2, CheckCircle2, AlertCircle, Zap, Shield, Loader2, MoreVertical } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
            <Button size="sm" variant="outline" disabled={!activeAssistant} className="cursor-pointer">
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
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidateAndSave}
                disabled={isValidating || !agentUrl.trim()}
                className="cursor-pointer"
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
      <div className="space-y-2">
        {!activeAssistant ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No active assistant selected.
          </div>
        ) : existingAgents.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No agents configured yet.
          </div>
        ) : (
          existingAgents.map((agent: A2AAgentInfo) => {
            return (
              <div
                key={agent.url}
                className="group py-3 px-3 rounded-md hover:bg-accent/50 transition-colors"
              >
                {/* Agent name and status */}
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  <h4 className="font-medium text-sm flex-1 truncate">{agent.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                    Validated
                  </span>

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => testConnection(agent)} className="cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                        Test Connection
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteAgent(agent.url)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Remove Agent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2 pl-5">
                    {agent.description}
                  </p>
                )}

                {/* URL */}
                <div className="pl-5">
                  <code className="text-[10px] text-muted-foreground truncate block">
                    {agent.url}
                  </code>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
