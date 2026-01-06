"use client";
import { useState } from "react";
import { usePlayground } from "@/components/providers/PlaygroundProvider";
import { Button } from "@/components/ui/button";
import { Plus, CheckCircle2, MoreVertical, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { A2ADialog } from "./dialogs/A2ADialog";

type A2AAgentInfo = {
  name: string;
  description: string;
  url: string;
};

type Skill = string | { name: string; [key: string]: any };

type AgentCard = {
  name: string;
  description: string;
  skills?: Skill[];
  version?: string;
};

interface SkillItemProps {
  skill: {
    name: string;
    description?: string;
    examples?: string[];
    [key: string]: any;
  };
}

const SkillItem = ({ skill }: SkillItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = skill.description || (skill.examples && skill.examples.length > 0);

  if (!hasDetails) {
    // Simple skill without details
    return (
      <div className="border border-blue-500/20 rounded-md px-2 py-1.5 bg-blue-500/5">
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
          {skill.name}
        </span>
      </div>
    );
  }

  return (
    <div className="border border-blue-500/20 rounded-md overflow-hidden bg-blue-500/5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-blue-500/10 cursor-pointer"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 flex-1">
          {skill.name}
        </span>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-blue-500/20 pt-2">
          {skill.description && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Description:</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{skill.description}</p>
            </div>
          )}

          {skill.examples && skill.examples.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Examples:</p>
              <ul className="text-[10px] text-muted-foreground space-y-1 pl-3">
                {skill.examples.map((example, idx) => (
                  <li key={idx} className="list-disc">{example}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function A2AAgentManager() {
  const { activeAssistant, updateAssistant } = usePlayground();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [a2aUrl, setA2AUrl] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Store agent card info (not persisted to backend)
  const [agentCards, setAgentCards] = useState<Record<string, AgentCard>>({});

  // Get existing a2a_agents from active assistant's config
  const existingAgents: A2AAgentInfo[] =
    (activeAssistant?.config as any)?.a2a_agents || [];

  const handleValidateAndSave = async () => {
    if (!a2aUrl.trim()) {
      toast.error("Agent URL is required");
      return;
    }

    try {
      // Validate URL format
      new URL(a2aUrl);

      setIsValidating(true);

      // Validate agent URL via backend
      const toastId = toast.loading("Validating agent URL...");
      const validationResponse = await fetch("/api/a2a/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agentUrl: a2aUrl }),
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

      // Store agent card info in state
      setAgentCards(prev => ({
        ...prev,
        [a2aUrl]: agentCard,
      }));

      toast.success(`Agent validated: ${agentName}`);

      // Check if agent already exists (by URL)
      const updatedAgents = [...existingAgents];
      const existingIdx = updatedAgents.findIndex(a => a.url === a2aUrl);

      const newAgent: A2AAgentInfo = {
        name: agentName,
        description: agentDescription,
        url: a2aUrl,
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

      setIsAddDialogOpen(false);
      setA2AUrl("");
      setIsValidating(false);
      toast.success("A2A agent saved successfully");
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

    try {
      const updatedAgents = existingAgents.filter(a => a.url !== agentUrl);

      await updateAssistant(activeAssistant.id, {
        config: {
          ...(activeAssistant.config as any),
          a2a_agents: updatedAgents,
        },
      });

      // Clean up agent card
      setAgentCards(prev => {
        const updated = { ...prev };
        delete updated[agentUrl];
        return updated;
      });

      toast.success("A2A agent removed");
    } catch (error) {
      toast.error("Failed to remove A2A agent");
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

        // Store/update agent card info in state
        setAgentCards(prev => ({
          ...prev,
          [agent.url]: agentCard,
        }));

        toast.success(`${agentName} is online!`);
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

  <button
    type="button"
    disabled={!activeAssistant}
    onClick={() => setIsAddDialogOpen(true)}
    aria-label="Add agent"
    title="Add agent"
    className="
      inline-flex items-center justify-center
      w-8 h-8
      rounded-md
      text-muted-foreground
      hover:text-foreground
      cursor-pointer
      transition
    "
  >
    <Plus className="w-4 h-4" />
  </button>
</div>


      <A2ADialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        a2aUrl={a2aUrl}
        setA2AUrl={setA2AUrl}
        isValidating={isValidating}
        onValidateAndSave={handleValidateAndSave}
      />

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
            const agentCard = agentCards[agent.url];
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

                {/* Skills */}
                {agentCard?.skills && agentCard.skills.length > 0 && (
                  <div className="pl-5 mb-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-2">Skills:</p>
                    <div className="space-y-1.5">
                      {agentCard.skills.map((skill, idx) => {
                        const skillData = typeof skill === 'string'
                          ? { name: skill }
                          : skill;
                        return (
                          <SkillItem key={idx} skill={skillData} />
                        );
                      })}
                    </div>
                  </div>
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
