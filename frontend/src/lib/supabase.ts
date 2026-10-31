/**
 * @file supabase.ts
 * @description Supabase client singleton with mock auth transport for offline development.
 * @owner Platform Core Team
 */

import { createClient } from "@supabase/supabase-js";
import { MOCK_ACCOUNTS, MOCK_REGISTERED_USERS_KEY } from "@/features/auth/services/mockAccounts";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";
const isMock = import.meta.env.VITE_USE_MOCKS === "true";

/**
 * Intercepts auth requests in offline mock mode so @supabase/auth-ui-react
 * works seamlessly without needing a live network connection.
 */
const mockFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (isMock && (url.includes("placeholder.supabase.co") || url.includes("/auth/v1/"))) {
    // 1. Handle Sign In (password token)
    if (url.includes("/token?grant_type=password") || (url.includes("/token") && init?.method === "POST")) {
      let body: any = {};
      try {
        body = JSON.parse((init?.body as string) || "{}");
      } catch {
        // Ignore
      }

      let rawId = (body.email || body.username || body.identifier || "student@campushub.edu").toLowerCase().trim();
      if (rawId.startsWith("@")) rawId = rawId.slice(1);

      // Check pre-configured mock accounts by email or handle
      let profile = Object.values(MOCK_ACCOUNTS).find(
        (acc) => acc.email.toLowerCase() === rawId || acc.profile.handle.toLowerCase() === rawId
      )?.profile;

      // Check registered mock users from localStorage
      if (!profile) {
        try {
          const registered = JSON.parse(localStorage.getItem(MOCK_REGISTERED_USERS_KEY) || "[]");
          const found = registered.find(
            (u: any) => u.email?.toLowerCase() === rawId || u.handle?.toLowerCase() === rawId
          );
          if (found) {
            profile = found.profile;
          }
        } catch {
          // Ignore
        }
      }

      if (!profile) {
        const handle = rawId.includes("@") ? rawId.split("@")[0] : rawId;
        profile = {
          id: `mock-${handle}-uuid`,
          handle,
          fullName: handle.replace(/[^a-zA-Z0-9]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
          avatarUrl: null,
          role: "student" as const,
          createdAt: new Date().toISOString(),
        };
      }

      const email = rawId.includes("@") ? rawId : `${profile.handle}@campushub.edu`;

      const mockResponse = {
        access_token: `mock-token-${profile.role}-${profile.id}`,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: profile.id,
          aud: "authenticated",
          role: "authenticated",
          email,
          email_confirmed_at: new Date().toISOString(),
          user_metadata: {
            full_name: profile.fullName,
            handle: profile.handle,
            avatar_url: profile.avatarUrl,
            role: profile.role,
          },
          app_metadata: {
            provider: "email",
          },
          created_at: profile.createdAt,
          updated_at: new Date().toISOString(),
        },
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Handle Sign Up
    if (url.includes("/signup") && init?.method === "POST") {
      let body: any = {};
      try {
        body = JSON.parse((init?.body as string) || "{}");
      } catch {
        // Ignore
      }

      const email = (body.email || "newstudent@campushub.edu").toLowerCase();
      let handle = (body.data?.handle || email.split("@")[0]).toLowerCase().trim();
      if (handle.startsWith("@")) handle = handle.slice(1);
      const fullName = body.data?.full_name || handle;

      const mockUser = {
        id: `mock-${handle}-uuid`,
        aud: "authenticated",
        role: "authenticated",
        email,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: fullName,
          handle,
          role: "student",
        },
        app_metadata: {
          provider: "email",
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockResponse = {
        user: mockUser,
        session: {
          access_token: `mock-token-student-${mockUser.id}`,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "mock-refresh-token",
          user: mockUser,
        },
      };

      return new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 3. Handle Logout / User Info / Others
    if (url.includes("/logout")) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return fetch(input, init);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: isMock ? mockFetch : fetch,
  },
});
