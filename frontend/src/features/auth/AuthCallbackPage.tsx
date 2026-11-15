/**
 * @file AuthCallbackPage.tsx
 * @description Handles Supabase Auth email confirmation, PKCE exchange, and password recovery.
 * @owner Platform Core Team
 */

import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authService } from "./services/authService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function handleAuthCallback() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const type = searchParams.get("type");
        const isRecoveryUrl =
          type === "recovery" ||
          window.location.search.includes("type=recovery") ||
          window.location.hash.includes("type=recovery");

        if (isMock) {
          if (isRecoveryUrl) {
            setIsRecovery(true);
            setIsVerifying(false);
          } else {
            navigate("/dashboard", { replace: true });
          }
          return;
        }

        // 1. If PKCE code exists in URL, explicitly exchange it for an active session
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Exchange code error:", exchangeError);
            throw new Error(
              exchangeError.message || "Failed to exchange authorization code. The link may have expired."
            );
          }
        }

        // 2. Check if active session is already present
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (sessionData?.session) {
          if (isRecoveryUrl) {
            if (isMounted) {
              setIsRecovery(true);
              setIsVerifying(false);
            }
            return;
          }

          toast.success("Email verified successfully! Welcome to CampusHub.");
          navigate("/dashboard", { replace: true });
          return;
        }

        // 3. If session not ready yet, wait for onAuthStateChange (implicit hash or async PKCE)
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (!isMounted) return;

          if (event === "PASSWORD_RECOVERY" || (isRecoveryUrl && session)) {
            setIsRecovery(true);
            setIsVerifying(false);
            authListener.subscription.unsubscribe();
            return;
          }

          if (event === "SIGNED_IN" && session) {
            if (isRecoveryUrl) {
              setIsRecovery(true);
              setIsVerifying(false);
            } else {
              toast.success("Email verified successfully! Welcome to CampusHub.");
              navigate("/dashboard", { replace: true });
            }
            authListener.subscription.unsubscribe();
          }
        });

        // 4. Timeout fallback if no valid session could be established
        const timeout = setTimeout(() => {
          if (!isMounted) return;
          authListener.subscription.unsubscribe();
          setIsVerifying(false);

          if (isRecoveryUrl) {
            setError(
              "Your password reset link is invalid, expired, or has already been used. Please request a new link."
            );
          } else {
            navigate("/login", { replace: true });
          }
        }, 5000);

        return () => {
          clearTimeout(timeout);
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        console.error("Auth callback error:", err);
        if (isMounted) {
          setError(err.message || "Failed to verify authentication link.");
          setIsVerifying(false);
          toast.error(err.message || "Authentication verification failed.");
        }
      }
    }

    handleAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanPass.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (cleanPass !== cleanConfirm) {
      toast.error("Passwords do not match. Please re-enter your password.");
      return;
    }

    // Verify session exists prior to update call
    if (!isMock) {
      const { data: currentSession } = await supabase.auth.getSession();
      if (!currentSession?.session) {
        toast.error("Your recovery session has expired. Please request a new password reset link.");
        setError("Your recovery session has expired. Please request a new reset link.");
        setIsRecovery(false);
        return;
      }
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.updatePassword(cleanPass, isMock);
      if (res.error) {
        toast.error(res.error.message);
      } else {
        setPasswordSuccess(true);
        toast.success("Password updated successfully!");
        setTimeout(() => {
          navigate("/dashboard", { replace: true });
        }, 1500);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border bg-card shadow-sm">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <h2 className="text-lg font-bold text-foreground">Verifying Your Campus Account...</h2>
          <p className="text-sm text-muted-foreground">
            Please wait while we establish your secure session.
          </p>
        </div>
      </div>
    );
  }

  if (isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full space-y-4 p-8 rounded-2xl border bg-card shadow-sm">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
              <KeyRound className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Set New Password</h2>
            <p className="text-xs text-muted-foreground">
              Please enter and confirm your new account password.
            </p>
          </div>

          {passwordSuccess ? (
            <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-center space-y-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-foreground">Password updated!</p>
              <p className="text-[11px] text-muted-foreground">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isUpdatingPassword}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isUpdatingPassword}
                />
              </div>

              <Button
                type="submit"
                disabled={isUpdatingPassword || newPassword.length < 6 || confirmPassword.length < 6}
                className="w-full text-xs font-semibold cursor-pointer"
              >
                {isUpdatingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Updating Password…
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl border bg-card shadow-sm">
        {error ? (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Verification Failed</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/forgot-password"
                className="w-full py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 inline-block text-center"
              >
                Request New Password Reset
              </Link>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 bg-muted text-foreground text-xs font-semibold rounded-lg hover:bg-muted/80"
              >
                Return to Login
              </button>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Verifying Your Campus Account...</h2>
            <p className="text-sm text-muted-foreground">
              Please wait while we establish your secure session.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;
