/**
 * @file LoginPage.tsx
 * @description Authentication page utilizing the modern shadcn/ui Auth block for both Login and Registration.
 * @owner Platform Core Team
 */

import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { LoginForm } from "./components/LoginForm";
import { useAuth } from "@/lib/auth-context";
import type { UserProfile } from "@/shared/user";

interface LoginPageProps {
  initialMode?: "signin" | "signup" | "verify";
}

export default function LoginPage({ initialMode }: LoginPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, isMock, setAuthUser } = useAuth();

  // Derive active mode directly from pathname, search params, or initial props
  const searchParams = new URLSearchParams(location.search);
  const queryMode = searchParams.get("mode") as "signin" | "signup" | "verify" | null;
  const isSignupPath = location.pathname.includes("/signup");
  const isVerifyPath = location.pathname.includes("/verify-email") || location.pathname.includes("/verify");
  const mode: "signin" | "signup" | "verify" =
    queryMode || (isVerifyPath ? "verify" : isSignupPath ? "signup" : (initialMode || "signin"));
  const emailParam = searchParams.get("email") || "";

  const rawDestination = (location.state as any)?.from?.pathname || "/";
  const destination =
    rawDestination === "/login" || rawDestination === "/signup" || rawDestination === "/verify-email"
      ? "/"
      : rawDestination;

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      navigate(destination, { replace: true });
    }
  }, [user, isLoading, navigate, destination]);

  const handleSuccess = (profile: UserProfile) => {
    setAuthUser(profile);
    navigate(destination, { replace: true });
  };

  const handleModeChange = (newMode: "signin" | "signup" | "verify" | "forgot", email?: string) => {
    if (newMode === "forgot") return;
    const search = email ? `?email=${encodeURIComponent(email)}` : "";
    const targetPath =
      newMode === "signup"
        ? `/signup${search}`
        : newMode === "verify"
          ? `/verify-email${search}`
          : `/login${search}`;
    if (location.pathname + location.search !== targetPath) {
      navigate(targetPath, { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* CampusHub Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CampusHub
          </h1>
          <p className="text-xs text-muted-foreground">
            Centralized campus learning, community, and academic companion
          </p>
        </div>

        {/* shadcn Login / Register / Verify Block */}
        <LoginForm
          mode={mode}
          onModeChange={handleModeChange}
          initialEmail={emailParam}
          isMock={isMock}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
