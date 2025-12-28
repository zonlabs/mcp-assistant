import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import Logo from "@/components/common/Logo";
import { ProfileDropdown } from "@/components/common/ProfileDropdown";
import { NavigationLinks } from "@/components/common/NavigationLinks";
import { MobileNav } from "@/components/common/MobileNav";

export default async function Header() {
  const session = await getServerSession(authOptions);

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

            {session?.user ? (
              <ProfileDropdown user={session.user} />
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
