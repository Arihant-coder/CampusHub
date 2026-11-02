/**
 * @file auth-context.tsx
 * @description Central authentication provider managing user session, roles, and mock bypass.
 * @owner Platform Core Team
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { UserProfile, UserRole } from "@/shared/user";
import { authService } from "@/features/auth/services/authService";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isMock: boolean;
  setAuthUser: (profile: UserProfile | null) => void;
  updateUserAvatar: (avatarUrl: string) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSessionToProfile(userObj: any): UserProfile {
  return {
    id: userObj.id,
    handle: userObj.user_metadata?.handle || userObj.email?.split("@")[0] || "user",
    fullName: userObj.user_metadata?.full_name || null,
    avatarUrl: userObj.user_metadata?.avatar_url || null,
    role: "student", // Strictly default fallback to student; privileged roles are resolved from public.profiles
    createdAt: userObj.created_at || new Date().toISOString(),
    isPrivate: false,
    privacyOnboardingCompleted: true,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMock = import.meta.env.VITE_USE_MOCKS === "true";
  const mockRoleEnv = import.meta.env.VITE_MOCK_ROLE as string | undefined;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        if (isMock) {
          // 1. Check for active cached mock session in localStorage first (user's explicit session)
          const cached = authService.getCachedMockUser();
          if (cached && isMounted) {
            setUser(cached);
            setIsLoading(false);
            return;
          }

          // 2. Check if VITE_MOCK_ROLE is specified in .env.local to skip login
          // (Only if the user did not explicitly sign out in this browser tab)
          const isSignedOut = sessionStorage.getItem("campushub:signed_out") === "true";
          if (mockRoleEnv && mockRoleEnv.trim() && !isSignedOut) {
            const autoUser = authService.getAutoMockUser(mockRoleEnv.trim());
            if (autoUser && isMounted) {
              setUser(autoUser);
              setIsLoading(false);
              return;
            }
          }

          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        // Live Supabase Mode
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          const profile = await authService.getLiveProfile(session.user.id);
          setUser(profile || mapSessionToProfile(session.user));
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen to live Supabase auth state changes if not in mock mode
    if (!isMock) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setTimeout(async () => {
            if (!session?.user) {
              if (isMounted) setUser(null);
              return;
            }

            const profile = await authService.getLiveProfile(session.user.id);
            if (isMounted) setUser(profile || mapSessionToProfile(session.user));
          }, 0);
        }
      );

      return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isMock, mockRoleEnv]);

  const setAuthUser = (profile: UserProfile | null) => {
    if (profile) {
      sessionStorage.removeItem("campushub:signed_out");
    }
    setUser(profile);
  };

  const updateUserAvatar = (avatarUrl: string) => {
    setUser((prev) => (prev ? { ...prev, avatarUrl } : null));
  };

  const refreshProfile = async () => {
    if (isMock) {
      const mockUser = authService.getMockUser();
      if (mockUser) {
        setUser({ ...mockUser });
      }
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await authService.getLiveProfile(session.user.id);
        if (profile) setUser(profile);
      }
    }
  };

  const logout = async () => {
    sessionStorage.setItem("campushub:signed_out", "true");
    if (isMock) {
      await authService.logout(true);
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isMock,
        setAuthUser,
        updateUserAvatar,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
