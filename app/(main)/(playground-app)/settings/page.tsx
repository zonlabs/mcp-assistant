"use client";

import { useState, useEffect } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User, Settings } from "lucide-react";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { SignOutButton } from "@/components/common/SignOutButton";
import { ThemeSelector } from "@/components/playground/ThemeSelector";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);

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
  const userEmail = user?.email;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center">
      <div className="max-w-2xl w-full px-8 py-12 space-y-12">
        <h1 className="text-3xl font-semibold">Settings</h1>

        {/* User Profile Section */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Profile</h2>
          <div className="flex items-center gap-4">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold truncate">{userName}</h3>
              {userEmail && (
                <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
              )}
            </div>
          </div>
        </section>

        <Separator />

        {/* Preferences Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Preferences</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-selector">Theme</Label>
              <ThemeSelector />
            </div>
          </div>
        </section>

        <Separator />

        {/* Sign Out Section */}
        {user && (
          <div>
            <SignOutButton />
          </div>
        )}
      </div>
    </div>
  );
}
