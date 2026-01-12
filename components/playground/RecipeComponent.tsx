// components/playground/RecipeComponent.tsx
import React from "react";

// 1. Data Definition: Easy to add/remove recipes here
const RECIPE_DATA = [
  {
    id: "create-a-bookmark",
    title: "Create a Bookmark",
    description: "Create a new bookmark in Bookmark Manager with title 'Study Tips' and description...",
    prompt: "Create a new bookmark in Bookmark Manager titled 'Study Tips'",
    icons: ["https://api.iconify.design/logos:vercel.svg"],
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
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 md:gap-3 w-full max-w-4xl mx-auto px-2 sm:px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {RECIPE_DATA.map((recipe) => (
        <button
          key={recipe.id}
          onClick={() => onAction(recipe.prompt)}
          className="group flex flex-col items-start p-2.5 sm:p-3.5 md:p-4 lg:p-5 text-left transition-all duration-200
                     bg-zinc-100 dark:bg-[#1c1c1c] border border-zinc-300 dark:border-white/5 rounded-lg sm:rounded-xl
                     hover:bg-zinc-200 dark:hover:bg-[#252525] hover:border-zinc-400 dark:hover:border-white/10 hover:shadow-lg dark:hover:shadow-2xl active:scale-[0.98]"
        >
          {/* Header Area */}
          <div className="flex w-full items-start justify-between gap-2 sm:gap-3 md:gap-4 mb-1 sm:mb-1.5 md:mb-2">
            <h3 className="text-sm sm:text-[15px] font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white leading-snug">
              {recipe.title}
            </h3>

            {/* Icon Stack */}
            <div className="flex -space-x-1.5 flex-shrink-0">
              {recipe.icons.map((icon, idx) => (
                <div
                  key={idx}
                  className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 p-0.5 sm:p-1 bg-zinc-200 dark:bg-[#2a2a2a] border border-zinc-300 dark:border-white/10 rounded shadow-sm flex items-center justify-center overflow-hidden"
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
          <p className="text-[11px] sm:text-xs md:text-[13px] leading-snug sm:leading-relaxed text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 line-clamp-2">
            {recipe.description}
          </p>
        </button>
      ))}
    </div>
  );
};