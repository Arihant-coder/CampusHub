/**
 * @file CommunityHeader.tsx
 * @description Forum banner header displaying community details, member stats, and artwork.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { Users, Network, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { communitiesService } from "../services";
import type { SubjectForum, CommunityModerator } from "../services/types";

interface CommunityHeaderProps {
  forum: SubjectForum;
}

export function CommunityHeader({ forum }: CommunityHeaderProps) {
  const [moderators, setModerators] = useState<CommunityModerator[]>([]);

  useEffect(() => {
    if (!forum.id) return;
    let isMounted = true;
    if (communitiesService.getCommunityModerators) {
      communitiesService.getCommunityModerators(forum.id).then((res) => {
        if (isMounted && res.data) {
          setModerators(res.data);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [forum.id]);

  // Format member count into k format, e.g. 1.2k
  const formattedCount =
    forum.memberCount >= 1000
      ? `${(forum.memberCount / 1000).toFixed(1)}k`
      : `${forum.memberCount}`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-xs">
      {/* Abstract Banner Artwork with Modern Collegiate Academic Wave */}
      <div className="h-28 sm:h-32 w-full bg-linear-to-r from-indigo-50/70 via-purple-50/40 to-slate-50/60 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900/40 relative overflow-hidden flex items-center justify-end px-8 pointer-events-none select-none border-b border-border/50">
        <svg
          className="absolute inset-0 w-full h-full opacity-40 dark:opacity-25"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 1000 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60 C 200 110, 400 10, 600 65 C 800 120, 900 30, 1000 50"
            stroke="currentColor"
            className="text-primary/40"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <path
            d="M0 80 C 250 30, 500 100, 750 40 C 900 20, 960 70, 1000 60"
            stroke="currentColor"
            className="text-primary/60"
            strokeWidth="1.5"
          />
          <circle cx="200" cy="55" r="3" className="fill-primary/60" />
          <circle cx="450" cy="40" r="2.5" className="fill-primary/60" />
          <circle cx="720" cy="50" r="3" className="fill-primary/70" />
          <circle cx="880" cy="30" r="2" className="fill-primary/50" />
        </svg>
      </div>

      {/* Community Info Overlay */}
      <div className="p-4 sm:p-5 flex items-start gap-4 -mt-10 sm:-mt-12 relative z-10">
        {/* Community Network / Subject Avatar */}
        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-card border-2 border-background shadow-md flex items-center justify-center shrink-0 text-primary">
          <Network className="h-9 w-9 sm:h-11 sm:w-11 stroke-[1.5]" />
        </div>

        {/* Title, Stats & Moderators */}
        <div className="pt-2 sm:pt-4 space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {forum.name}
            </h2>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/80">
              {forum.code}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {formattedCount} users
            </span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Moderators:</span>
              {moderators.length > 0 ? (
                moderators.map((m) => (
                  <span key={m.userId} className="text-foreground font-semibold">
                    @{m.handle || m.fullName?.toLowerCase().replace(/\s+/g, "_") || "mod"}
                  </span>
                ))
              ) : (
                <span className="italic">None assigned</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

