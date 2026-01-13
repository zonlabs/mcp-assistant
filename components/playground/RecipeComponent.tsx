import React from "react";

const RECIPE_DATA = [
  {
    id: "gmail-draft",
    title: "Create Email Draft",
    description: "Create an email draft to my email address with subject \"Hi from...",
    prompt: "Draft an email to me with the subject 'Hi from Smithery'",
    icons: ["https://api.iconify.design/logos:google-gmail.svg"],
  },
  {
    id: "pricing-research",
    title: "Competitor Pricing Research",
    description: "Research and document our",
    prompt: "Research competitor pricing and create a summary in Notion.",
    icons: ["https://api.iconify.design/logos:linear.svg", "https://api.iconify.design/logos:notion-icon.svg"],
  },
  {
    id: "calendar-check",
    title: "Next Week's Schedule",
    description: "What's my busiest day next week and when do I have free time?",
    prompt: "Look at my calendar for next week and tell me when I have focus time.",
    icons: ["https://api.iconify.design/logos:google-calendar.svg"],
  },
  {
    id: "create-bookmark",
    title: "Create Bookmark",
    description: "Helps user create a bookmark in Bookmark Manager...",
    prompt: "Create a bookmark called StudyTips in my Bookmark Manager for easy access to study resources.",
    icons: ["https://api.iconify.design/logos:vercel.svg"],
  },
  {
    id: "db-optimize",
    title: "Optimize Queries",
    description: "Explore opportunities to add indexes and make my queries...",
    prompt: "Analyze my database performance and suggest query optimizations.",
    icons: ["https://api.iconify.design/logos:supabase.svg"], 
  },
  {
    id: "prep-meeting",
    title: "Meeting Preparation",
    description: "Prepare for my upcoming meeting by getting relevant issues from...",
    prompt: "Help me prepare for my next meeting by summarizing recent Linear issues.",
    icons: ["https://api.iconify.design/logos:linear.svg", "https://api.iconify.design/logos:notion-icon.svg"],
  },
];

interface RecipeComponentProps {
  onAction: (prompt: string) => void;
}

export const RecipeComponent: React.FC<RecipeComponentProps> = ({ onAction }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-4xl mx-auto">
      {RECIPE_DATA.map((recipe) => (
        <button
          key={recipe.id}
          onClick={() => onAction(recipe.prompt)}
          className="group flex flex-col items-start p-5 text-left transition-all duration-200
                     bg-[#181818] border border-white/10 rounded-xl
                     hover:bg-[#202020] hover:border-white/20 active:scale-[0.98]"
        >
          {/* Header: Title and Icons */}
          <div className="flex w-full items-start justify-between mb-3">
            <h3 className="text-lg font-semibold text-zinc-200 leading-tight font-serif tracking-tight">
              {recipe.title}
            </h3>

            {/* Icon Stack */}
            <div className="flex -space-x-1 flex-shrink-0">
              {recipe.icons.map((icon, idx) => (
                <div
                  key={idx}
                  className="w-5 h-5 flex items-center justify-center overflow-hidden"
                >
                  {icon.startsWith('http') ? (
                    <img src={icon} alt="app" className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all" />
                  ) : (
                    <span className="text-sm">{icon}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <p className="text-[14px] leading-snug text-zinc-500 group-hover:text-zinc-400 line-clamp-2">
            {recipe.description}
          </p>
        </button>
      ))}
    </div>
  );
};