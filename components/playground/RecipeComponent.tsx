import React from "react";

const RECIPE_DATA = [
  {
    id: "create-a-bookmark",
    title: "Create a Bookmark",
    description: "Create a new bookmark in Bookmark Manager with title 'Study Tips' and description...",
    prompt: "Create a new bookmark in Bookmark Manager titled 'Study Tips'",
    icons: ["https://api.iconify.design/logos:vercel.svg"],
  },
  {
    id: "pricing-research",
    title: "Competitor Pricing Research",
    description: "Research and document our competitors’ pricing.",
    icons: [
      "https://api.iconify.design/logos:linear.svg",
      "https://api.iconify.design/logos:notion-icon.svg",
    ],
  },
  {
    id: "optimize-queries",
    title: "Optimize Queries",
    description: "Explore opportunities to add indexes and make my queries...",
    icons: ["https://api.iconify.design/logos:supabase.svg"],
  },
  {
    id: "email-draft",
    title: "Create Email Draft",
    description: "Create an email draft to my email address with subject 'Hi from...'",
    icons: ["https://api.iconify.design/logos:google-gmail.svg"],
  },
  {
    id: "schedule",
    title: "Next Week’s Schedule",
    description: "What’s my busiest day next week and when do I have free time?",
    icons: ["https://api.iconify.design/logos:google-calendar.svg"],
  },
  {
    id: "meeting-prep",
    title: "Meeting Preparation",
    description: "Prepare for my upcoming meeting by getting relevant issues from...",
    icons: [
      "https://api.iconify.design/logos:linear.svg",
      "https://api.iconify.design/logos:notion-icon.svg",
    ],
  },
];

interface Props {
  onAction: (text: string) => void;
}

export const RecipeComponent: React.FC<Props> = ({ onAction }) => {
  return (
    <div className="grid sm:grid-cols-3 gap-2 max-w-4xl mx-auto">
      {RECIPE_DATA.map((item) => (
        <button
          key={item.id}
          onClick={() => onAction(item.description)}
          className="
            group relative text-left
            h-[96px]                   
            rounded-lg border border-white/10
            bg-zinc-900/70
            px-4 py-3
            flex flex-col justify-between
            hover:bg-zinc-800/70 hover:border-white/20
            transition-all
          "
        >
          {/* Icons */}
          <div className="absolute top-3 right-3 flex gap-1">
            {item.icons.map((icon, i) => (
              <img
                key={i}
                src={icon}
                className="w-4 h-4 opacity-70 group-hover:opacity-100"
                alt=""
              />
            ))}
          </div>

          {/* Content */}
          <div className="pr-10">
            <h3 className="text-sm font-semibold text-white">
              {item.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-400 leading-snug line-clamp-2">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
