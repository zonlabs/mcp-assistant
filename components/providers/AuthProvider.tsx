"use client";

import type { PropsWithChildren } from "react";

// With Supabase, we can often rely on the library hooks directly.
// If typical global auth state is needed, we can build a context later.
// For now, this is a passthrough to avoid breaking the tree.
export default function AuthProvider({ children }: PropsWithChildren) {
  return <>{children}</>;
}
