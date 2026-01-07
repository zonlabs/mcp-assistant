"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Network,
  LucideIcon,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { A2AAgentManager } from "./A2AAgentManager";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarNavLinkProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const SidebarNavLink = ({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: SidebarNavLinkProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
        isCollapsed ? "justify-center px-0" : "gap-3 px-3",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </button>
  );
};

export const PlaygroundSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"agents">("agents");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest';
  const userImage = user?.user_metadata?.avatar_url;

  // Determine which logo to show based on theme
  const currentTheme = mounted ? (resolvedTheme || theme) : 'dark';
  const logoSrc = currentTheme === 'dark' ? '/images/logo-dark.png' : '/images/logo-light.png';

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="relative flex">
      <div
        className={cn(
          "transition-all duration-300 ease-in-out border-r flex flex-col bg-background",
          isOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          "flex items-center pt-3 px-3 pb-3 flex-shrink-0",
          isOpen ? "justify-start" : "justify-center"
        )}>
          <button
            onClick={() => router.push('/playground')}
            className={cn(
              "flex items-center rounded-md hover:bg-accent/50 transition-colors cursor-pointer",
              isOpen ? "p-2" : "p-1"
            )}
            title="Playground"
          >
            {mounted && (
              <Image
                src={logoSrc}
                alt="MCP Assistant"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            )}
          </button>
        </div>

      {/* Navigation Links */}
      <div
        className={cn(
          "pb-3 space-y-1 flex-shrink-0",
          isOpen ? "px-2" : "px-1"
        )}
      >
        <SidebarNavLink
          icon={Network}
          label="A2A (Experimental)"
          isActive={activeSection === "agents"}
          isCollapsed={!isOpen}
          onClick={() => setActiveSection("agents")}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <div
          className={cn(
            "h-full transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {isOpen && (
            <div className="h-full pr-4 pl-4 pt-4 overflow-y-auto space-y-4">
              {/* Experimental Note */}
              <div className="rounded-md border border-dashed bg-accent/20 p-3 text-xs text-muted-foreground">
                <strong>Experimental:</strong> A2A protocol support is still in progress.
                Feel free to test interactions with open remote agents that implement the A2A standard.
              </div>
              <A2AAgentManager />
            </div>
          )}
        </div>
      </div>

        {/* Profile Dropdown at Bottom */}
        <div className={cn("p-3 flex-shrink-0")}>
          {isOpen ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-full flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer hover:bg-accent"
                  title="Profile"
                >
                  {userImage ? (
                    <Image
                      src={userImage}
                      alt={userName}
                      width={40}
                      height={40}
                      className="rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col items-start overflow-hidden flex-1">
                    <span className="text-sm font-medium truncate w-full">{userName}</span>
                    {user?.email && (
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {user.email}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56 mb-2">
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => setIsOpen(true)}
              className="w-full flex items-center justify-center p-2 rounded-md transition-colors cursor-pointer hover:bg-accent"
              title="Profile"
            >
              {userImage ? (
                <Image
                  src={userImage}
                  alt={userName}
                  width={32}
                  height={32}
                  className="rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Toggle Button - Outside Sidebar */}
      {isOpen ? (
        <button
          onClick={() => setIsOpen(false)}
          className="absolute -right-3 top-4 z-10 p-1 rounded-full bg-background border border-border shadow-sm hover:bg-accent transition-colors cursor-pointer"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="absolute -right-3 top-4 z-10 p-1 rounded-full bg-background border border-border shadow-sm hover:bg-accent transition-colors cursor-pointer"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
