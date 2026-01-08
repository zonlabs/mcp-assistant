"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { User, Bot, Server, Network } from "lucide-react";

interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: SettingsNavItem[] = [
  { label: "Account", href: "/settings", icon: User },
  { label: "Assistants", href: "/settings/assistants", icon: Bot },
  { label: "Connectors", href: "/settings/connectors", icon: Server },
  { label: "A2A Agents", href: "/settings/agents", icon: Network },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex h-full p-6 mt-8">
      {/* Left Navigation */}
      <div className="w-64 pr-6">
        <div className="border-r border-border h-full pr-6">
          <h2 className="text-lg font-semibold mb-6">Settings</h2>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
