import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";

function decodeJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.exp ? payload.exp * 1000 : null;
  } catch (error) {
    return null;
  }
}

async function refreshGoogleToken(token: JWT) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw refreshedTokens;

    const idTokenExpiry = refreshedTokens.id_token
      ? decodeJwtExpiry(refreshedTokens.id_token)
      : null;

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      googleIdToken: refreshedTokens.id_token,
      googleIdTokenExpires: idTokenExpiry,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        const idTokenExpiry = account.id_token
          ? decodeJwtExpiry(account.id_token)
          : null;

        return {
          ...token,
          accessToken: account.access_token,
          googleIdToken: account.id_token,
          googleIdTokenExpires: idTokenExpiry,
          refreshToken: account.refresh_token,
          accessTokenExpires: Date.now() + (account.expires_at! * 1000),
        };
      }

      const idTokenExpiry = token.googleIdTokenExpires as number;
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!idTokenExpiry || now >= idTokenExpiry - fiveMinutes) {
        return await refreshGoogleToken(token);
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return {
        ...session,
        googleIdToken: token.googleIdToken as string | undefined,
      };
    },
  },
  pages: { signIn: "/signin" },
};
