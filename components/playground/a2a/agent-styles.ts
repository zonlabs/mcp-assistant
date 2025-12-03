/**
 * Agent styling configuration for A2A message visualization
 * Maps agent names to their visual styles (colors, icons, framework labels)
 */

interface AgentStyle {
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  framework?: string;
}

const agentStyleMap: Record<string, AgentStyle> = {
  "Research Agent": {
    icon: "🔍",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-400",
    framework: "LangGraph",
  },
  "Analysis Agent": {
    icon: "📊",
    bgColor: "bg-purple-100",
    textColor: "text-purple-700",
    borderColor: "border-purple-400",
    framework: "LangGraph",
  },
  "Research Assistant": {
    icon: "🔬",
    bgColor: "bg-cyan-100",
    textColor: "text-cyan-700",
    borderColor: "border-cyan-400",
    framework: "ADK",
  },
  "Budget Agent": {
    icon: "💰",
    bgColor: "bg-green-100",
    textColor: "text-green-700",
    borderColor: "border-green-400",
    framework: "LangGraph",
  },
  "Itinerary Agent": {
    icon: "🗺️",
    bgColor: "bg-orange-100",
    textColor: "text-orange-700",
    borderColor: "border-orange-400",
    framework: "LangGraph",
  },
};

const defaultStyle: AgentStyle = {
  icon: "🤖",
  bgColor: "bg-gray-100",
  textColor: "text-gray-700",
  borderColor: "border-gray-400",
};

export function getAgentStyle(agentName: string): AgentStyle {
  return agentStyleMap[agentName] || defaultStyle;
}

export function truncateTask(task: string, maxLength: number = 100): string {
  if (task.length <= maxLength) return task;
  return task.substring(0, maxLength) + "...";
}
