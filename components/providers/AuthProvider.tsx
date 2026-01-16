"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";

export interface UserSession extends Session {
  role?: string;
}

interface AuthContextValue {
  userSession: UserSession | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps extends PropsWithChildren {
  userSession?: UserSession | null;
}

export default function AuthProvider({ children, userSession = null }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={{ userSession }}>
      {children}
    </AuthContext.Provider>
  );
}
