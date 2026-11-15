/**
 * @file AuthCallbackPage.tsx
 * @description Handles Supabase Auth email confirmation and OAuth redirection callbacks.
 * @owner Platform Core Team
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authService } from "./services/authService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const isRecoveryMode =
      window.location.search.includes("type=recovery") ||
      window.location.hash.includes("type=recovery");

    if (isRecoveryMode) {
      setIsRecovery(true);
      return;
    }

    async function handleAuthCallback() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (data?.session) {
          toast.success("Email verified successfully! Welcome to CampusHub.");
          navigate("/dashboard", { replace: true });
        } else {
          // Listen for token hash resolution
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "PASSWORD_RECOVERY") {
              setIsRecovery(true);
              return;
            }
            if (event === "SIGNED_IN" && session) {
              toast.success("Email verified successfully! Welcome to CampusHub.");
              authListener.subscription.unsubscribe();
              navigate("/dashboard", { replace: true });
            }
          });

          // Timeout fallback if no session received
          const timeout = setTimeout(() => {
            authListener.subscription.unsubscribe();
            navigate("/login", { replace: true });
          }, 3500);

          return () => clearTimeout(timeout);
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Failed to verify email confirmation link.");
        toast.error(err.message || "Authentication verification failed.");
      }
    }

    handleAuthCallback();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim().length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.updatePassword(newPassword, false);
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
              Please enter your new account password below.
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isUpdatingPassword}
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                disabled={isUpdatingPassword || newPassword.length < 6}
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
            <button
              onClick={() => navigate("/login")}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90"
            >
              Return to Login
            </button>
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

