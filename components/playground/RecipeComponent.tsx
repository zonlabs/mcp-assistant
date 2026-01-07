// components/playground/RecipeComponent.tsx
import React from "react";

// 1. Data Definition: Easy to add/remove recipes here
const RECIPE_DATA = [
  {
    id: "linear-issue",
    title: "Create Issue",
    description: "Create a new issue in Linear with title 'Check out Smithery' and description...",
    prompt: "Create a new issue in Linear titled 'Check out Smithery'",
    icons: ["https://api.iconify.design/logos:linear.svg"],
  },
  {
    id: "gmail-draft",
    title: "Create Email Draft",
    description: "Create an email draft to my email address with subject 'Hi from Smithery'...",
    prompt: "Draft an email to me with the subject 'Hi from Smithery'",
    icons: ["https://api.iconify.design/logos:google-gmail.svg"],
  },
  {
    id: "pricing-research",
    title: "Competitor Pricing Research",
    description: "Research and document our competitor's pricing into Notion and Linear...",
    prompt: "Research competitor pricing and create a summary in Notion.",
    icons: ["https://api.iconify.design/logos:notion-icon.svg", "https://api.iconify.design/logos:linear.svg"],
  },
  {
    id: "db-optimize",
    title: "Optimize Queries",
    description: "Explore opportunities to add indexes and make my queries more efficient...",
    prompt: "Analyze my database performance and suggest query optimizations.",
    icons: ["⚡"], // Using an emoji as a fallback
  },
  {
    id: "calendar-check",
    title: "Next Week's Schedule",
    description: "What's my busiest day next week and when do I have free time?",
    prompt: "Look at my calendar for next week and tell me when I have focus time.",
    icons: ["https://api.iconify.design/logos:google-calendar.svg"],
  },
  {
    id: "prep-meeting",
    title: "Meeting Preparation",
    description: "Prepare for my upcoming meeting by getting relevant issues from Linear...",
    prompt: "Help me prepare for my next meeting by summarizing recent Linear issues.",
    icons: ["https://api.iconify.design/logos:linear.svg", "https://api.iconify.design/logos:notion-icon.svg"],
  },
];

interface RecipeComponentProps {
  onAction: (prompt: string) => void;
}

export const RecipeComponent: React.FC<RecipeComponentProps> = ({ onAction }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {RECIPE_DATA.map((recipe) => (
        <button
          key={recipe.id}
          onClick={() => onAction(recipe.prompt)}
          className="group flex flex-col items-start p-5 text-left transition-all duration-200 
                     bg-[#1c1c1c] border border-white/5 rounded-xl 
                     hover:bg-[#252525] hover:border-white/10 hover:shadow-2xl active:scale-[0.98]"
        >
          {/* Header Area */}
          <div className="flex w-full items-start justify-between gap-4 mb-2">
            <h3 className="text-[15px] font-medium text-zinc-100 group-hover:text-white">
              {recipe.title}
            </h3>
            
            {/* Icon Stack */}
            <div className="flex -space-x-1.5">
              {recipe.icons.map((icon, idx) => (
                <div 
                  key={idx} 
                  className="w-6 h-6 p-1 bg-[#2a2a2a] border border-white/10 rounded shadow-sm flex items-center justify-center overflow-hidden"
                >
                  {icon.startsWith('http') ? (
                    <img src={icon} alt="app" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs">{icon}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Description Area */}
          <p className="text-[13px] leading-relaxed text-zinc-400 group-hover:text-zinc-300 line-clamp-2">
            {recipe.description}
          </p>
        </button>
      ))}
    </div>
  );
};