/**
 * @file LoginForm.tsx
 * @description Modern shadcn/ui login & registration form block supporting custom unique handles,
 *              real-time availability checks, clear inline error feedback, and offline fallback.
 * @owner Platform Core Team
 */

import React, { useState, useEffect } from "react";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "../services/authService";
import { useDebounce } from "@/lib/use-debounce";
import type { UserProfile } from "@/shared/user";
import { toast } from "sonner";

interface LoginFormProps {
  mode?: "signin" | "signup";
  onModeChange?: (mode: "signin" | "signup") => void;
  isMock: boolean;
  onSuccess: (profile: UserProfile) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  mode: controlledMode,
  onModeChange,
  isMock,
  onSuccess,
}) => {
  const [internalMode, setInternalMode] = useState<"signin" | "signup">(controlledMode || "signin");

  // Keep internal state aligned if parent passes down a new mode
  useEffect(() => {
    if (controlledMode) {
      setInternalMode(controlledMode);
    }
  }, [controlledMode]);

  const currentMode = controlledMode || internalMode;

  const handleSetMode = (nextMode: "signin" | "signup") => {
    setInternalMode(nextMode);
    onModeChange?.(nextMode);
    setHandleStatus({ available: null });
    setErrorMessage(null);
  };

  // Sign-in identifier (accepts either username or email)
  const [identifier, setIdentifier] = useState("");

  // Sign-up specific fields
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleStatus, setHandleStatus] = useState<{
    available: boolean | null;
    error?: string;
  }>({ available: null });

  // Debounced handle for real-time validation & availability check
  const debouncedHandle = useDebounce(handle.trim(), 300);

  useEffect(() => {
    let isCancelled = false;

    async function evaluateHandle() {
      if (currentMode !== "signup" || !debouncedHandle) {
        setHandleStatus({ available: null });
        setIsCheckingHandle(false);
        return;
      }

      const validation = authService.validateHandle(debouncedHandle);
      if (!validation.valid) {
        setHandleStatus({ available: false, error: validation.error });
        setIsCheckingHandle(false);
        return;
      }

      setIsCheckingHandle(true);
      const res = await authService.checkHandleAvailability(debouncedHandle, isMock);

      if (!isCancelled) {
        setIsCheckingHandle(false);
        setHandleStatus({
          available: res.available,
          error: res.error,
        });
      }
    }

    evaluateHandle();

    return () => {
      isCancelled = true;
    };
  }, [debouncedHandle, currentMode, isMock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentMode === "signin") {
      const trimmedId = identifier.trim();
      if (!trimmedId) {
        setErrorMessage("Please enter your campus email.");
        return;
      }
      if (!password) {
        setErrorMessage("Please enter your password.");
        return;
      }

      setIsLoading(true);
      const res = await authService.login(trimmedId, password, isMock);
      setIsLoading(false);

      if (res.error) {
        const message = res.error.message || "Invalid campus email or password. Please try again.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (res.data) {
        toast.success(`Welcome back, ${res.data.fullName || res.data.handle}!`);
        onSuccess(res.data);
      }
    } else {
      // Sign-up validation
      const cleanHandle = handle.trim().toLowerCase();
      if (!cleanHandle) {
        setErrorMessage("Please choose a username.");
        return;
      }
      if (!fullName.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (!email.trim()) {
        setErrorMessage("Please enter your campus email.");
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage("Password must be at least 6 characters.");
        return;
      }

      // Check handle status
      if (handleStatus.available === false) {
        const errorText = handleStatus.error || "Please choose a valid and available username.";
        setErrorMessage(errorText);
        return;
      }

      // If check is still pending or wasn't triggered yet
      if (handleStatus.available === null) {
        const val = authService.validateHandle(cleanHandle);
        if (!val.valid) {
          const errorText = val.error || "Invalid username format.";
          setErrorMessage(errorText);
          return;
        }
        setIsLoading(true);
        const check = await authService.checkHandleAvailability(val.cleanHandle, isMock);
        if (!check.available) {
          setIsLoading(false);
          const errorText = check.error || "This username is already taken.";
          setErrorMessage(errorText);
          return;
        }
      }

      setIsLoading(true);
      const res = await authService.signUp(email, password, fullName, cleanHandle, isMock);
      setIsLoading(false);

      if (res.error) {
        setErrorMessage(res.error.message);
        toast.error(res.error.message);
        return;
      }

      if (res.data) {
        if (res.data.requiresVerification) {
          toast.info("Account created! Please check your campus email inbox to verify your account, then sign in.", {
            duration: 7000,
          });
          handleSetMode("signin");
          setIdentifier(email);
        } else {
          toast.success(`Account @${res.data.handle} created successfully!`);
          onSuccess(res.data);
        }
      }
    }
  };

  return (
    <Card className="w-full shadow-sm border bg-card">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {currentMode === "signin" ? "Sign in to your account" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {currentMode === "signin"
            ? "Enter your campus email and password below"
            : "Enter your university credentials to get started"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Inline Feedback Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
            <span className="font-medium leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentMode === "signup" ? (
            <>
              {/* Unique Username / Handle Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="handle">Username</Label>
                  {isCheckingHandle && (
                    <span className="flex items-center text-[11px] text-muted-foreground">
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Checking...
                    </span>
                  )}
                  {!isCheckingHandle && handleStatus.available === true && debouncedHandle && (
                    <span className="flex items-center text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Available
                    </span>
                  )}
                  {!isCheckingHandle && handleStatus.available === false && (
                    <span className="flex items-center text-[11px] font-medium text-destructive">
                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                      {handleStatus.error || "Unavailable"}
                    </span>
                  )}
                </div>

                <Input
                  id="handle"
                  type="text"
                  placeholder="unique_username"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value.toLowerCase().replace(/\s+/g, "_"));
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                />
                <p className="text-[11px] text-muted-foreground">
                  4–20 characters. Lowercase letters, numbers, and underscores only.
                </p>
              </div>

              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Campus Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@college.edu"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  disabled={isLoading}
                />
              </div>
            </>
          ) : (
            /* Sign In: Campus Email Field */
            <div className="space-y-2">
              <Label htmlFor="identifier">Campus Email</Label>
              <Input
                id="identifier"
                type="email"
                placeholder="student@college.edu"
                autoComplete="email"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isLoading}
                aria-invalid={Boolean(errorMessage)}
                className={errorMessage ? "border-destructive focus-visible:ring-destructive" : ""}
              />
            </div>
          )}

          {/* Password Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {currentMode === "signin" && (
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info("Password reset instructions will be sent to your account's email.");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline"
                >
                  Forgot password?
                </a>
              )}
            </div>
            <Input
              id="password"
              type="password"
              placeholder={currentMode === "signup" ? "At least 6 characters" : undefined}
              autoComplete={currentMode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              required
              disabled={isLoading}
              aria-invalid={Boolean(errorMessage)}
              className={errorMessage ? "border-destructive focus-visible:ring-destructive" : ""}
            />
          </div>

          <Button
            type="submit"
            className="w-full font-medium cursor-pointer"
            disabled={isLoading || (currentMode === "signup" && isCheckingHandle)}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading
              ? currentMode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : currentMode === "signin"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs">
          <span className="text-muted-foreground">
            {currentMode === "signin" ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            type="button"
            onClick={() => handleSetMode(currentMode === "signin" ? "signup" : "signin")}
            className="font-medium text-primary hover:underline underline-offset-4 cursor-pointer"
          >
            {currentMode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};
