"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/"; // Force refresh to update server state
  };

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm transition-colors"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign out</span>
    </button>
  );
}
