/**
 * @file NotFoundPage.tsx
 * @description Catch-all 404 page for unknown routes.
 * @owner Platform Core Team
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 shadow-xs">
        <Compass className="h-10 w-10 animate-pulse" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        404 - Page Not Found
      </h1>
      <p className="mt-3 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed">
        The page you are looking for doesn't exist, was removed, or is temporarily unavailable.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        <Button
          onClick={() => navigate("/dashboard")}
          className="gap-2 cursor-pointer"
        >
          <Home className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};

