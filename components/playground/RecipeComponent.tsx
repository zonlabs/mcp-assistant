import React from "react";

const RECIPE_DATA = [
  {
    id: "stock-research",
    title: "Market Analysis",
    description: "Use Alpha Vantage to research our top 3 competitors’ current stock performance and pricing trends.",
    icons: [
      "https://media.licdn.com/dms/image/v2/C4E0BAQExXHCGjZYOeg/company-logo_200_200/company-logo_200_200/0/1635279005628/alpha_vantage_inc_logo?e=2147483647&v=beta&t=1eCKMzXdgp4XiMrzN4edDUCqMdUSHQ9nx5nXjD8RQ3Q",
    ],
  },
  {
    id: "web-search",
    title: "Semantic Search",
    description: "Search the web using Exa to find the latest research papers on LLM optimization from the past month.",
    icons: ["https://awsmp-logos.s3.amazonaws.com/seller-7s5a3z2w3unay/b6519f9126c0432087c79827b95283c6.png"],
  },
  {
    id: "email-draft",
    title: "Draft Email",
    description: "Draft a professional follow-up email to my team regarding the project status with the subject 'Weekly Sync Update'.",
    icons: ["https://api.iconify.design/logos:google-gmail.svg"],
  },
  {
    id: "calendar-audit",
    title: "Review Schedule",
    description: "Analyze my Google Calendar for next week: identify my busiest day and find a 2-hour window for deep work.",
    icons: ["https://api.iconify.design/logos:google-calendar.svg"],
  },
  {
    id: "notion-meeting-prep",
    title: "Notion Meeting Prep",
    description: "Generate a briefing document by synthesizing project notes and recent updates directly from Notion.",
    icons: [
      "https://api.iconify.design/logos:notion-icon.svg",
    ],
  },
  {
    id: "create-bookmark",
    title: "Save Bookmark",
    description: "Create a new bookmark titled 'Study Tips' in my Bookmark Manager with a description about learning strategies.",
    icons: ["https://smlvqzf0a1b66cku.public.blob.vercel-storage.com/images/Vercel%20Logo-IMoeV2W33gFclXzAfZxmAHqtjBuTzP.png"],
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
            rounded-lg border border-zinc-200 dark:border-white/10
            bg-white dark:bg-zinc-900/70
            px-4 py-3
            flex flex-col justify-between
            hover:bg-zinc-50 dark:hover:bg-zinc-800/70
            hover:border-zinc-300 dark:hover:border-white/20
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
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {item.title}
            </h3>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">
              {item.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};
