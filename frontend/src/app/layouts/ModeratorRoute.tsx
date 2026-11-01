/**
 * @file ModeratorRoute.tsx
 * @description Route guard allowing access if the user is an admin OR is assigned as a moderator
 *              to at least one community (or a specific subject if subjectId prop is passed).
 * @owner Platform Core Team
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

interface ModeratorRouteProps {
  children?: React.ReactNode;
  fallbackPath?: string;
  subjectId?: string;
}

export const ModeratorRoute: React.FC<ModeratorRouteProps> = ({
  children,
  fallbackPath = "/communities",
  subjectId,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAllowed = Boolean(
    user &&
      (user.role === "admin" ||
        (subjectId
          ? user.moderatedSubjectIds?.includes(subjectId)
          : (user.moderatedSubjectIds && user.moderatedSubjectIds.length > 0)))
  );

  if (!user || !isAllowed) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

