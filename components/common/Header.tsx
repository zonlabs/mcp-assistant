import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import Logo from "@/components/common/Logo";
import { ProfileDropdown } from "@/components/common/ProfileDropdown";
import { NavigationLinks } from "@/components/common/NavigationLinks";
import { MobileNav } from "@/components/common/MobileNav";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="sticky top-0 z-50 bg-background/80">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="relative flex items-center justify-between">
          {/* Left: Mobile menu, Logo */}
          <div className="flex items-center gap-2">
            {/* Mobile */}
            <div className="md:hidden">
              <MobileNav />
            </div>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <span className="text-sm font-semibold text-foreground hidden sm:inline-block">
                MCP Assistant
              </span>
            </Link>
          </div>

          {/* Center: Desktop Nav */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <NavigationLinks />
          </div>

          {/* Right: Theme + Profile */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {user ? (
              <ProfileDropdown user={user} />
            ) : (
              <Link
                href="/signin"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
