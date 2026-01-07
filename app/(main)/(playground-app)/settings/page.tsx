"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User as SupabaseUser } from "@supabase/supabase-js";
import Image from "next/image";
import { ThemeSelector } from "@/components/playground/ThemeSelector";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const router = useRouter();

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

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest";
  const userImage = user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="pl-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1">Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-8 max-w-2xl">
        {/* Profile Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Profile</h3>

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
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-xl">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <p className="text-base font-medium">{userName}</p>
              {user?.email && (
                <p className="text-sm text-muted-foreground">{user.email}</p>
              )}
            </div>
          </div>
        </section>

        <div className="border-t border-border"></div>

        {/* Preferences Section */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Preferences</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Theme</label>
              <ThemeSelector />
            </div>
          </div>
        </section>

        <div className="border-t border-border"></div>

        {/* Sign Out Button */}
        <section>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors cursor-pointer text-sm"
          >
            Sign Out
          </button>
        </section>
      </div>
    </div>
  );
}
