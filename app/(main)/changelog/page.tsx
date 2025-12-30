import { Metadata } from "next";
import { Clock, Wrench, Bug, Sparkles, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog | MCP Hub",
  description: "Latest updates, improvements, and bug fixes for MCP Hub",
};

interface Change {
  description: string;
  subItems?: string[];
}

interface ChangeGroup {
  category: "new" | "fixed" | "improved";
  changes: Change[];
}

interface ChangelogEntry {
  date: string;
  groups: ChangeGroup[];
}

const changelog: ChangelogEntry[] = [
  {
    date: "November 10, 2025",
    groups: [
      {
        category: "improved",
        changes: [
          { description: "Update layout title and enhance homepage structure" },
          { description: "Update agent initialization in AG-UI handler to use the updated graph variable" },
        ]
      },
    ]
  },
  {
    date: "November 5-9, 2025",
    groups: [
      {
        category: "improved",
        changes: [
          { description: "Enhance OAuth callback handling to dynamically select frontend URL" },
          { description: "Refactor MCP page structure for improved readability and organization" },
          { description: "Add favicon and update layout metadata" },
        ]
      },
      {
        category: "fixed",
        changes: [
          { description: "Fix tool execution rendering after responding graph with cancel response" },
        ]
      },
    ]
  },
  {
    date: "November 1-4, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Add Assistant management components and refactor ChatInput for improved functionality" },
          { description: "Add available models and assistant selection dialog" },
          { description: "Add human-in-the-loop approval for tool execution and enhance routing logic" },
          { description: "Implement useDebounce hook for search functionality" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Add PlaygroundProvider and refactor Playground components for improved state management" },
          { description: "Enhance homepage layout and animations for improved user engagement" },
          { description: "Update dependencies and refactor Playground components for improved functionality" },
          { description: "Refactor category fetching and filtering in McpClientLayout with category selection" },
          { description: "Refactor animation variants in homepage and update MCP references" },
          { description: "Enhance tool call management and state handling in agent logic" },
        ]
      },
    ]
  },
  {
    date: "October 29-31, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Add Category model and integrate with MCPServer" },
          { description: "Add category slug field for URL-friendly filtering" },
          { description: "Add seed script for populating Category data in MCP Hub" },
          { description: "Add McpArchitecture component and architecture visualization section" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Revamp Hero and Features sections for enhanced user engagement" },
          { description: "Refactor Apollo Client setup for improved authentication and error handling" },
          { description: "Enhance GraphQL API integration with category support" },
          { description: "Update GraphQL endpoint to conditionally set graphql_ide parameter" },
          { description: "Enhance Redis connection management in MCPRedisManager" },
        ]
      },
    ]
  },
  {
    date: "October 26-28, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Add MCP OAuth Implementation Guide documentation" },
          { description: "Add OAuth flow support for MCP servers with SimpleTokenAuth" },
          { description: "Enhance MCP server GraphQL schema with pagination, filtering, and ordering" },
          { description: "Add changelog page and update navigation links" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Implement OAuth flow for MCP server actions and enhance logging" },
          { description: "Refactor OAuth handling and introduce SimpleTokenAuth" },
          { description: "Refactor MCP server connection and OAuth handling" },
          { description: "Refactor OAuth storage and clean up unused code in backend" },
          { description: "Refactor logging in OAuth helper functions" },
          { description: "Remove toast notifications for server actions and loading states" },
          { description: "Refactor error handling and logging in API routes" },
        ]
      },
    ]
  },
  {
    date: "October 24-25, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Implement homepage redesign with improved layout and branding" },
          { description: "Add privacy policy page" },
          { description: "Enhance Header component with branding and beta indication" },
          { description: "Add support for OpenRouter models in backend" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Refactor MCPToolCall component for improved readability and structure" },
          { description: "Enhance error handling in MCPToolCall component" },
          { description: "Refactor UI components for improved styling and consistency" },
          { description: "Enhance McpClientLayout with image integration for server icons" },
          { description: "Refactor UI elements and improve accessibility across multiple pages" },
          { description: "Enhance user authentication flow and UI in multiple components" },
          { description: "Add comprehensive logging across oauth_storage" },
          { description: "Update settings.py to add logging configuration" },
        ]
      },
    ]
  },
  {
    date: "October 20-23, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Add server description field support and UI integration" },
          { description: "Add audio transcription endpoint in backend" },
          { description: "Implement push-to-talk functionality in ChatInput and PlaygroundPage" },
          { description: "Add ToolsExplorer component to McpClientLayout for enhanced tool management" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Implement custom minimal scrollbar and enhance ServerFormModal layout" },
          { description: "Enhance logging in Google token refresh process" },
          { description: "Enhance Google token management with JWT expiry decoding" },
          { description: "Refine OAuth2 indication and badge styling in McpClientLayout" },
          { description: "Enhance server management with description support and UI improvements" },
          { description: "Refactor ServerFormModal to use Controller for checkbox inputs" },
          { description: "Enhance styling and responsiveness in Playground and ChatInput components" },
          { description: "Refactor sessionId handling in ChatInput for improved clarity and efficiency" },
          { description: "Refactor sessionId generation to improve handling for authenticated and anonymous users" },
        ]
      },
      {
        category: "fixed",
        changes: [
          { description: "Fix server-side rendering errors with sessionId generation" },
          { description: "Remove is_public lookup to allow users to connect to their personal MCP servers" },
          { description: "Fix Google verification file location" },
        ]
      },
    ]
  },
  {
    date: "October 16-19, 2025",
    groups: [
      {
        category: "new",
        changes: [
          { description: "Add new Header component integrating profile dropdown and navigation links" },
          { description: "Add health check API route" },
          { description: "Introduce NavigationLinks and ProfileDropdown components for better modularity" },
        ]
      },
      {
        category: "improved",
        changes: [
          { description: "Enhance PlaygroundPage with ChatInput component for improved user interaction" },
          { description: "Refactor agent naming in layout and playground components to use camelCase" },
          { description: "Update Copilot API route to include CORS headers and integrate HttpAgent" },
          { description: "Refactor McpClientWrapper to separate public and user servers using useMemo" },
          { description: "Refactor page components to clean up imports and improve state management" },
          { description: "Simplify error handling in ServerManagement and ServerFormModal components" },
        ]
      },
    ]
  },
  {
    date: "September 5-17, 2025",
    groups: [
      {
        category: "new",
        changes: [
          {
            description: "Initial release of MCP Hub platform",
            subItems: [
              "Google OAuth authentication",
              "Dynamic MCP server connections with multiple transport types",
              "AI-powered chat using LangGraph agents",
              "GraphQL API integration",
              "Support for both authenticated and anonymous users",
              "Public and private MCP server configurations",
              "Real-time tool discovery and binding",
              "Server management UI with full CRUD operations",
              "Theme support (light/dark mode)",
            ]
          },
        ]
      },
    ]
  },
];

const categoryConfig = {
  new: {
    icon: Sparkles,
    label: "New",
    iconColor: "text-amber-400",
  },
  fixed: {
    icon: Wrench,
    label: "Fixed",
    iconColor: "text-blue-400",
  },
  improved: {
    icon: Zap,
    label: "Improved",
    iconColor: "text-purple-400",
  },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Page Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold mb-3">Changelog</h1>
          <p className="text-muted-foreground text-lg">Track our development journey and feature releases</p>
        </div>

        {/* Timeline Entries */}
        <div className="space-y-12">
          {changelog.map((entry, idx) => (
            <div key={entry.date} className="grid grid-cols-[200px_1fr] gap-8">
              {/* Left Side - Date */}
              <div className="pt-1">
                <div className="flex items-center gap-2 text-primary font-medium">
                  <Clock className="h-4 w-4" />
                  <span>{entry.date}</span>
                </div>
              </div>

              {/* Right Side - Changes */}
              <div className="space-y-8">
                {entry.groups.map((group, groupIdx) => {
                  const config = categoryConfig[group.category];
                  const Icon = config.icon;

                  return (
                    <div key={groupIdx}>
                      {/* Category Header */}
                      <div className="flex items-center gap-2 mb-4">
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                        <h3 className="text-lg font-semibold">{config.label}</h3>
                      </div>

                      {/* Changes List */}
                      <ul className="space-y-3">
                        {group.changes.map((change, changeIdx) => (
                          <li key={changeIdx}>
                            <div className="text-muted-foreground leading-relaxed">
                              • {change.description}
                            </div>
                            {change.subItems && (
                              <ul className="mt-2 ml-6 space-y-2">
                                {change.subItems.map((subItem, subIdx) => (
                                  <li key={subIdx} className="text-sm text-muted-foreground/80 leading-relaxed">
                                    ◦ {subItem}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
