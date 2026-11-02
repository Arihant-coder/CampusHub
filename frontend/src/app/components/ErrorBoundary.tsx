/**
 * @file ErrorBoundary.tsx
 * @description Root route error element to prevent blank white screens on runtime exceptions.
 * @owner Platform Core Team
 */

import React from "react";
import { useRouteError, useNavigate } from "react-router-dom";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const RootErrorBoundary: React.FC = () => {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  const errorMessage =
    error?.statusText ||
    error?.message ||
    "An unexpected error occurred while rendering this page.";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6 shadow-xs">
        <AlertTriangle className="h-10 w-10" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground leading-relaxed">
        {errorMessage}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="gap-2 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          Reload Page
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          className="gap-2 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
};

