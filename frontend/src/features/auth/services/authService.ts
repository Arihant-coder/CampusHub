/**
 * @file authService.ts
 * @description Unified authentication service supporting Supabase Auth and offline mock fallback,
 *              featuring custom unique handles/usernames, campus domain validation, and fail-closed checks.
 * @owner Platform Core Team
 */

import { supabase } from "@/lib/supabase";
import type { Result } from "@/shared/result";
import type { UserProfile, UserRole } from "@/shared/user";
import { MOCK_ACCOUNTS, MOCK_REGISTERED_USERS_KEY } from "./mockAccounts";

const MOCK_STORAGE_KEY = "campushub:mock_session";

const RESERVED_HANDLES = new Set([
  "admin",
  "moderator",
  "system",
  "campushub",
  "support",
  "anonymous",
  "null",
  "undefined",
  "root",
  "staff",
]);

export interface RegisteredMockUser {
  handle: string;
  email: string;
  password?: string;
  profile: UserProfile;
}

export const authService = {
  /**
   * Sanitizes and validates a username/handle format.
   * Handles must be 4-20 characters long and consist of alphanumeric characters and underscores.
   */
  validateHandle(handle: string): { valid: boolean; error?: string; cleanHandle: string } {
    let clean = (handle || "").trim().toLowerCase();
    if (clean.startsWith("@")) {
      clean = clean.slice(1);
    }

    if (!clean) {
      return { valid: false, error: "Username is required.", cleanHandle: clean };
    }

    if (clean.length < 4) {
      return { valid: false, error: "Username must be at least 4 characters.", cleanHandle: clean };
    }

    if (clean.length > 20) {
      return { valid: false, error: "Username cannot exceed 20 characters.", cleanHandle: clean };
    }

    const regex = /^[a-z0-9_]+$/;
    if (!regex.test(clean)) {
      return {
        valid: false,
        error: "Username may only contain lowercase letters, numbers, and underscores.",
        cleanHandle: clean,
      };
    }

    if (RESERVED_HANDLES.has(clean)) {
      return { valid: false, error: `'${clean}' is a reserved handle.`, cleanHandle: clean };
    }

    return { valid: true, cleanHandle: clean };
  },

  /**
   * Checks if a handle is available for registration.
   * Strictly FAILS CLOSED on network, RPC, or query error.
   */
  async checkHandleAvailability(
    handle: string,
    isMock: boolean
  ): Promise<{ available: boolean; error?: string }> {
    const validation = this.validateHandle(handle);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    const cleanHandle = validation.cleanHandle;

    if (isMock) {
      // 1. Check default pre-configured mock accounts
      const conflictMock = Object.values(MOCK_ACCOUNTS).some(
        (acc) => acc.profile.handle.toLowerCase() === cleanHandle
      );
      if (conflictMock) {
        return { available: false, error: "This username is already taken." };
      }

      // 2. Check locally registered mock accounts
      const localUsers = this.getRegisteredMockUsers();
      const conflictLocal = localUsers.some(
        (acc) => acc.handle.toLowerCase() === cleanHandle
      );
      if (conflictLocal) {
        return { available: false, error: "This username is already taken." };
      }

      return { available: true };
    }

    // Live Supabase RPC check (Fails closed on error)
    try {
      const { data, error } = await supabase.rpc("check_handle_available", {
        p_handle: cleanHandle,
      });

      if (error) {
        return {
          available: false,
          error: "Unable to verify username availability right now. Please try again.",
        };
      }

      return {
        available: Boolean(data),
        error: !data ? "This username is already taken." : undefined,
      };
    } catch {
      return {
        available: false,
        error: "Unable to verify username availability right now. Please check your connection.",
      };
    }
  },

  /**
   * Sign-in handler using campus email and password.
   */
  async login(emailInput: string, password: string, isMock: boolean): Promise<Result<UserProfile>> {
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      return {
        data: null,
        error: { code: "VALIDATION", message: "Please enter your campus email." },
      };
    }

    if (isMock) {
      // Check pre-configured mock accounts (by email or handle)
      const match = Object.values(MOCK_ACCOUNTS).find(
        (acc) =>
          acc.email.toLowerCase() === cleanEmail ||
          acc.profile.handle.toLowerCase() === cleanEmail
      );

      if (match) {
        if (password && password !== match.password) {
          return {
            data: null,
            error: { code: "UNAUTHENTICATED", message: "Invalid email or password." },
          };
        }
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(match.profile));
        return { data: match.profile, error: null };
      }

      // Check registered mock accounts
      const localUsers = this.getRegisteredMockUsers();
      const registeredMatch = localUsers.find(
        (u) =>
          u.email.toLowerCase() === cleanEmail ||
          u.handle.toLowerCase() === cleanEmail
      );

      if (registeredMatch) {
        if (password && registeredMatch.password && password !== registeredMatch.password) {
          return {
            data: null,
            error: { code: "UNAUTHENTICATED", message: "Invalid email or password." },
          };
        }
        localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(registeredMatch.profile));
        return { data: registeredMatch.profile, error: null };
      }

      return {
        data: null,
        error: { code: "UNAUTHENTICATED", message: "Invalid email or password." },
      };
    }

    // Live Supabase Authentication strictly using email and password
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        return {
          data: null,
          error: { code: "UNAUTHENTICATED", message: error?.message || "Invalid email or password" },
        };
      }

      const profile = await this.getLiveProfile(data.user.id);
      if (profile) {
        return { data: profile, error: null };
      }

      // Fallback profile if row is still synchronizing
      return {
        data: {
          id: data.user.id,
          handle: data.user.user_metadata?.handle || data.user.email?.split("@")[0] || "user",
          fullName: data.user.user_metadata?.full_name || null,
          avatarUrl: data.user.user_metadata?.avatar_url || null,
          role: "student",
          createdAt: data.user.created_at,
        },
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message || "Network error during login" },
      };
    }
  },

  /**
   * Universal sign-up handler with custom username/handle and campus domain enforcement.
   */
  async signUp(
    email: string,
    password: string,
    fullName: string,
    handle: string,
    isMock: boolean
  ): Promise<Result<UserProfile & { requiresVerification?: boolean }>> {
    const cleanEmail = email.trim().toLowerCase();
    const handleValidation = this.validateHandle(handle);

    if (!handleValidation.valid) {
      return {
        data: null,
        error: { code: "VALIDATION", message: handleValidation.error || "Invalid username." },
      };
    }

    const cleanHandle = handleValidation.cleanHandle;

    // Check availability
    const availability = await this.checkHandleAvailability(cleanHandle, isMock);
    if (!availability.available) {
      return {
        data: null,
        error: { code: "VALIDATION", message: availability.error || "Username is already taken." },
      };
    }

    if (isMock) {
      const newMockProfile: UserProfile = {
        id: `mock-${cleanHandle}-uuid`,
        handle: cleanHandle,
        fullName: fullName.trim() || cleanHandle,
        avatarUrl: null,
        role: "student",
        createdAt: new Date().toISOString(),
      };

      this.saveRegisteredMockUser({
        handle: cleanHandle,
        email: cleanEmail,
        password,
        profile: newMockProfile,
      });

      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(newMockProfile));
      return { data: { ...newMockProfile, requiresVerification: false }, error: null };
    }

    // Live Supabase Sign Up with redirect URL
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName.trim() || cleanHandle,
            handle: cleanHandle,
          },
        },
      });

      if (error || !data.user) {
        let msg = error?.message || "Sign up failed";
        if (msg.includes("Registration restricted to authorized campus email domains")) {
          msg = "Registration is restricted to authorized campus email domains (e.g. @college.edu).";
        } else if (msg.includes("already taken") || msg.toLowerCase().includes("duplicate_object")) {
          msg = "This username is already taken. Please choose another username.";
        } else if (msg.includes("Database error saving new user")) {
          msg = "Registration failed: please ensure your email domain is authorized and username is unique.";
        }
        return {
          data: null,
          error: { code: "INTERNAL", message: msg },
        };
      }

      // Check if user already exists
      if (data.user.identities && data.user.identities.length === 0) {
        return {
          data: null,
          error: {
            code: "VALIDATION",
            message: "An account with this email already exists. Please sign in instead.",
          },
        };
      }

      const hasSession = Boolean(data.session);
      const profile = await this.getLiveProfile(data.user.id);
      return {
        data: {
          ...(profile || {
            id: data.user.id,
            handle: cleanHandle,
            fullName: fullName.trim() || cleanHandle,
            avatarUrl: null,
            role: "student",
            createdAt: data.user.created_at,
          }),
          requiresVerification: !hasSession,
        },
        error: null,
      };
    } catch (err: unknown) {
      return {
        data: null,
        error: { code: "NETWORK", message: (err as Error).message || "Network error during sign up" },
      };
    }
  },

  /**
   * Auto-login helper based on VITE_MOCK_ROLE.
   */
  getAutoMockUser(mockRoleEnv?: string): UserProfile | null {
    if (!mockRoleEnv) return null;
    const roleKey = mockRoleEnv.toLowerCase().trim() as UserRole;
    if (MOCK_ACCOUNTS[roleKey]) {
      const profile = MOCK_ACCOUNTS[roleKey].profile;
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }
    return null;
  },

  /**
   * Get cached mock user from localStorage if present.
   */
  getCachedMockUser(): UserProfile | null {
    try {
      const item = localStorage.getItem(MOCK_STORAGE_KEY);
      if (item) {
        return JSON.parse(item) as UserProfile;
      }
    } catch {
      // Ignore parse failure
    }
    return null;
  },

  /**
   * Returns list of custom accounts registered while running in mock mode.
   */
  getRegisteredMockUsers(): RegisteredMockUser[] {
    try {
      const item = localStorage.getItem(MOCK_REGISTERED_USERS_KEY);
      if (item) {
        return JSON.parse(item) as RegisteredMockUser[];
      }
    } catch {
      // Ignore parse failure
    }
    return [];
  },

  /**
   * Persists a newly signed up mock user locally.
   */
  saveRegisteredMockUser(user: RegisteredMockUser): void {
    try {
      const list = this.getRegisteredMockUsers();
      list.push(user);
      localStorage.setItem(MOCK_REGISTERED_USERS_KEY, JSON.stringify(list));
    } catch {
      // Ignore
    }
  },

  /**
   * Log out from active mode.
   */
  async logout(isMock: boolean): Promise<void> {
    if (isMock) {
      localStorage.removeItem(MOCK_STORAGE_KEY);
    } else {
      await supabase.auth.signOut();
    }
  },

  /**
   * Retrieves current active mock user profile from storage.
   */
  getMockUser(): UserProfile | null {
    try {
      const item = localStorage.getItem(MOCK_STORAGE_KEY);
      if (item) {
        return JSON.parse(item) as UserProfile;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  /**
   * Live Supabase: Fetch profile strictly from public.profiles table and community_moderators.
   */
  async getLiveProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, role, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    const { data: modRows } = await supabase
      .from("community_moderators")
      .select("subject_id")
      .eq("user_id", userId);

    const moderatedSubjectIds = (modRows || []).map((r: { subject_id: string }) => r.subject_id);

    return {
      id: data.id,
      handle: data.handle,
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      role: data.role as UserRole,
      createdAt: data.created_at,
      moderatedSubjectIds,
    };
  },
};
