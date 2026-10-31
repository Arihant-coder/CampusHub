/**
 * @file AuthCallbackPage.tsx
 * @description Handles Supabase Auth email confirmation and OAuth redirection callbacks.
 * @owner Platform Core Team
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

