/**
 * @file LoginForm.tsx
 * @description Modern shadcn/ui login & registration form block supporting custom unique handles,
 *              real-time availability checks, clear inline error feedback, dedicated email verification
 *              screen, and offline fallback.
 * @owner Platform Core Team
 */

import React, { useState, useEffect, useRef } from "react";
import { Loader2, Check, AlertCircle, Mail, RefreshCw, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "../services/authService";
import { useDebounce } from "@/lib/use-debounce";
import type { UserProfile } from "@/shared/user";
import { toast } from "sonner";

interface LoginFormProps {
  mode?: "signin" | "signup" | "verify" | "forgot";
  onModeChange?: (mode: "signin" | "signup" | "verify" | "forgot", email?: string) => void;
  initialEmail?: string;
  isMock: boolean;
  onSuccess: (profile: UserProfile) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  mode: controlledMode,
  onModeChange,
  initialEmail,
  isMock,
  onSuccess,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [internalMode, setInternalMode] = useState<"signin" | "signup" | "verify" | "forgot">(
    controlledMode || "signin"
  );

  // Sign-in identifier (accepts either username or email)
  const [identifier, setIdentifier] = useState(initialEmail || "");

  // Forgot password identifier
  const [forgotIdentifier, setForgotIdentifier] = useState(initialEmail || "");
  const [resetSent, setResetSent] = useState(false);

  // Sign-up specific fields
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Verification state
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>(initialEmail || "");
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCheckingHandle, setIsCheckingHandle] = useState(false);
  const [handleStatus, setHandleStatus] = useState<{
    available: boolean | null;
    error?: string;
  }>({ available: null });

  // Countdown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Keep unconfirmedEmail updated if initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setUnconfirmedEmail(initialEmail);
      setEmail((prev) => prev || initialEmail);
      setIdentifier((prev) => prev || initialEmail);
    }
  }, [initialEmail]);

  const resetFormInputs = (keepEmail?: string) => {
    setIdentifier(keepEmail || "");
    setHandle("");
    setEmail(keepEmail || "");
    setFullName("");
    setPassword("");
    setConfirmPassword("");
    setHandleStatus({ available: null });
    formRef.current?.reset();
  };

  // Keep internal state aligned if parent passes down a new mode
  useEffect(() => {
    if (controlledMode) {
      setInternalMode(controlledMode);
      if (controlledMode !== "verify") {
        setErrorMessage(null);
      }
    }
  }, [controlledMode]);

  const currentMode = internalMode;

  const handleSetMode = (nextMode: "signin" | "signup" | "verify" | "forgot", keepEmail?: string) => {
    setInternalMode(nextMode);
    onModeChange?.(nextMode);
    if (nextMode !== "verify" && nextMode !== "forgot") {
      resetFormInputs(keepEmail);
    }
    setErrorMessage(null);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = forgotIdentifier.trim();
    if (!clean) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authService.requestPasswordReset(clean, isMock);
      if (res.error) {
        setErrorMessage(res.error.message);
        toast.error(res.error.message);
      } else {
        setResetSent(true);
        toast.success("Password reset instructions sent! Please check your email.");
      }
    } catch (err: any) {
      const msg = err.message || "Failed to request password reset.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleResendConfirmation = async () => {
    const targetEmail = unconfirmedEmail.trim() || email.trim();
    if (!targetEmail) {
      toast.error("Please enter your campus email address to resend confirmation.");
      return;
    }
    setIsResending(true);
    const res = await authService.resendVerificationEmail(targetEmail, isMock);
    setIsResending(false);

    if (res.error) {
      toast.error(res.error.message || "Failed to resend confirmation email.");
    } else {
      toast.success("Confirmation link resent! Check your inbox and spam folder.");
      setResendCooldown(60);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (currentMode === "signin") {
      const trimmedId = identifier.trim();
      const currentPassword = password;
      if (!trimmedId) {
        setErrorMessage("Please enter your campus email or username.");
        return;
      }
      if (!currentPassword) {
        setErrorMessage("Please enter your password.");
        return;
      }

      // Reset input fields immediately upon form submission
      resetFormInputs();

      setIsLoading(true);
      const res = await authService.login(trimmedId, currentPassword, isMock);
      setIsLoading(false);

      if (res.error) {
        const rawMessage = res.error.message || "Invalid campus email, username, or password. Please try again.";
        const isEmailNotConfirmed = rawMessage.toLowerCase().includes("email not confirmed");

        if (isEmailNotConfirmed) {
          const detectedEmail = trimmedId.includes("@") ? trimmedId : unconfirmedEmail;
          if (detectedEmail) {
            setUnconfirmedEmail(detectedEmail);
          }
          setErrorMessage("Your campus email is not confirmed yet. Please verify your email before signing in.");
        } else {
          setErrorMessage(rawMessage);
        }
        toast.error(rawMessage);
        return;
      }

      if (res.data) {
        toast.success(`Welcome back, ${res.data.fullName || res.data.handle}!`);
        onSuccess(res.data);
      }
    } else if (currentMode === "signup") {
      // Sign-up validation
      const cleanHandle = handle.trim().toLowerCase();
      const currentFullName = fullName.trim();
      const currentEmail = email.trim();
      const currentPassword = password;

      if (!cleanHandle) {
        setErrorMessage("Please choose a username.");
        return;
      }
      if (!currentFullName) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (!currentEmail) {
        setErrorMessage("Please enter your campus email.");
        return;
      }
      if (!currentPassword || currentPassword.length < 6) {
        setErrorMessage("Password must be at least 6 characters.");
        return;
      }
      if (currentPassword !== confirmPassword) {
        setErrorMessage("Passwords do not match.");
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

      // Reset input fields immediately upon form submission
      resetFormInputs();

      setIsLoading(true);
      const res = await authService.signUp(currentEmail, currentPassword, currentFullName, cleanHandle, isMock);
      setIsLoading(false);

      if (res.error) {
        setErrorMessage(res.error.message);
        toast.error(res.error.message);
        return;
      }

      if (res.data) {
        if (res.data.requiresVerification) {
          setUnconfirmedEmail(currentEmail);
          handleSetMode("verify", currentEmail);
          toast.info("Account created! Please check your campus email to verify your account.", {
            duration: 8000,
          });
        } else {
          toast.success(`Account @${res.data.handle} created successfully!`);
          onSuccess(res.data);
        }
      }
    }
  };

  // Dedicated View for Email Verification
  if (currentMode === "verify") {
    return (
      <Card className="w-full shadow-sm border bg-card">
        <CardHeader className="space-y-3 text-center pb-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Mail className="h-7 w-7" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Confirm your email
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              {unconfirmedEmail ? (
                <>
                  We sent a confirmation link to <br />
                  <span className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2">
                    {unconfirmedEmail}
                  </span>
                </>
              ) : (
                "We sent a confirmation link to your campus email address."
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          <div className="rounded-lg border border-border/70 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              What to do next:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
              <li>Open your email inbox and click the verification link.</li>
              <li>Please check your <strong>Spam / Junk</strong> folder if you don't see it.</li>
              <li>Once confirmed, click the button below to sign in.</li>
            </ul>
          </div>

          {!unconfirmedEmail && (
            <div className="space-y-1.5">
              <Label htmlFor="verify-email-input" className="text-xs">Campus Email</Label>
              <Input
                id="verify-email-input"
                type="email"
                placeholder="student@college.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setUnconfirmedEmail(e.target.value);
                }}
              />
            </div>
          )}

          <div className="space-y-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs font-medium cursor-pointer"
              disabled={isResending || resendCooldown > 0}
              onClick={handleResendConfirmation}
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Sending email...
                </>
              ) : resendCooldown > 0 ? (
                `Resend link in ${resendCooldown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Resend confirmation email
                </>
              )}
            </Button>

            <Button
              type="button"
              className="w-full text-xs font-medium cursor-pointer"
              onClick={() => {
                handleSetMode("signin", unconfirmedEmail);
              }}
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              Back to sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dedicated View for Forgot Password
  if (currentMode === "forgot") {
    return (
      <Card className="w-full shadow-sm border bg-card">
        <CardHeader className="space-y-2 text-center pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Reset your password
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Enter your campus email or username to receive password reset instructions.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {resetSent ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-muted/40 p-3.5 text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  Check your inbox
                </p>
                <p className="text-[11px] leading-relaxed">
                  If an account exists for <strong className="text-foreground">{forgotIdentifier}</strong>, we have sent a password reset link. Please check your spam folder if you do not see it within a few minutes.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs font-semibold cursor-pointer"
                onClick={() => {
                  setResetSent(false);
                  handleSetMode("signin");
                }}
              >
                <ArrowLeft className="mr-2 h-3.5 w-3.5" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              {errorMessage && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="forgot-identifier">Campus Email or Username</Label>
                <Input
                  id="forgot-identifier"
                  type="text"
                  placeholder="student@campushub.edu or @username"
                  value={forgotIdentifier}
                  onChange={(e) => {
                    setForgotIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !forgotIdentifier.trim()}
                className="w-full text-xs font-semibold cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Sending Reset Link…
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => handleSetMode("signin")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                >
                  Remembered your password? <span className="font-semibold text-primary underline underline-offset-4">Sign in</span>
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-sm border bg-card">
      <CardHeader className="space-y-1.5 text-center pb-4">
        <CardTitle className="text-xl font-semibold tracking-tight">
          {currentMode === "signin" ? "Sign in to your account" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {currentMode === "signin"
            ? "Enter your campus email or username below"
            : "Enter your university credentials to get started"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Inline Feedback Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
              <span className="font-medium leading-snug">{errorMessage}</span>
            </div>
            {errorMessage.toLowerCase().includes("not confirmed") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-full text-xs font-semibold border-destructive/40 bg-background text-foreground hover:bg-muted cursor-pointer"
                onClick={() => {
                  const target = identifier.includes("@") ? identifier.trim() : unconfirmedEmail || email.trim();
                  if (target) {
                    setUnconfirmedEmail(target);
                  }
                  handleSetMode("verify", target);
                }}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5 text-primary" />
                Open Email Confirmation Screen
              </Button>
            )}
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
            /* Sign In: Campus Email or Username Field */
            <div className="space-y-2">
              <Label htmlFor="identifier">Campus Email or Username</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="student@college.edu or handle"
                autoComplete="username"
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
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setResetSent(false);
                    setForgotIdentifier(identifier);
                    handleSetMode("forgot");
                  }}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-4 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
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

          {currentMode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                required
                disabled={isLoading}
                aria-invalid={Boolean(errorMessage)}
                className={errorMessage ? "border-destructive focus-visible:ring-destructive" : ""}
              />
            </div>
          )}

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
