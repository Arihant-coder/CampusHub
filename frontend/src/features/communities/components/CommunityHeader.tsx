/**
 * @file CommunityHeader.tsx
 * @description Forum banner header displaying community details, member stats, and pin toggle.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { Users, Network, ShieldCheck, Pin, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { communitiesService } from "../services";
import type { SubjectForum, CommunityModerator } from "../services/types";
import { useAuth } from "@/lib/auth-context";
import { canModerate } from "@/shared/user";
import { CommunityImageEditDialog } from "./CommunityImageEditDialog";

interface CommunityHeaderProps {
  forum: SubjectForum;
  isPinned?: boolean;
  isEnrolled?: boolean;
  onTogglePin?: () => void;
  onForumUpdated?: (updated: SubjectForum) => void;
}

export function CommunityHeader({
  forum,
  isPinned = false,
  isEnrolled = false,
  onTogglePin,
  onForumUpdated,
}: CommunityHeaderProps) {
  const { user, isMock } = useAuth();
  const [moderators, setModerators] = useState<CommunityModerator[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"banner" | "logo">("banner");

  const hasModAuthority = canModerate(user, forum.id);

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

  const handleOpenEdit = (tab: "banner" | "logo") => {
    setDialogTab(tab);
    setDialogOpen(true);
  };

  // Format member count into k format, e.g. 1.2k
  const formattedCount =
    forum.memberCount >= 1000
      ? `${(forum.memberCount / 1000).toFixed(1)}k`
      : `${forum.memberCount}`;

  return (
    <div className="relative rounded-2xl border border-border/70 bg-card/50 backdrop-blur-xs shadow-sm overflow-hidden select-none group/header">
      {/* 1. Cinematic Panoramic Banner (Reddit + Google Classroom) */}
      <div className="relative w-full h-36 sm:h-44 md:h-52 bg-muted/40 overflow-hidden group/banner">
        {forum.bannerUrl ? (
          <>
            <img
              src={forum.bannerUrl}
              alt={`${forum.name} banner`}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/banner:scale-105"
            />
            {/* Subtle bottom vignette to ensure seamless transition to the lower section */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/15 to-transparent dark:from-slate-950/80 dark:via-slate-950/20 dark:to-transparent" />
          </>
        ) : (
          /* Sleek Minimal Backdrop with subtle geometric grid & atmospheric gradient */
          <div className="w-full h-full relative overflow-hidden bg-slate-950 select-none">
            {/* Deep refined background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#0a0f1d] to-[#090d16]" />
            <div className="absolute -top-12 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Minimalist subtle grid pattern */}
            <svg
              className="absolute inset-0 w-full h-full opacity-60"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="minimal-banner-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <circle cx="40" cy="40" r="1" fill="rgba(255,255,255,0.12)" />
                </pattern>
                <radialGradient id="banner-sheen" cx="70%" cy="25%" r="65%">
                  <stop offset="0%" stopColor="rgba(99,102,241,0.12)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#minimal-banner-grid)" />
              <rect width="100%" height="100%" fill="url(#banner-sheen)" />
            </svg>

            {/* Subtle bottom vignette to ensure seamless transition to the lower section */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent pointer-events-none" />
          </div>
        )}

        {/* Staff-only Edit Banner Button */}
        {hasModAuthority && (
          <div className="absolute top-3 right-3 opacity-0 group-hover/banner:opacity-100 transition-opacity z-20">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleOpenEdit("banner")}
              className="h-7 px-2.5 text-xs font-semibold shadow-md bg-background/85 hover:bg-background backdrop-blur-md gap-1.5 cursor-pointer text-foreground border border-border/60"
              title="Edit community banner"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Edit Banner</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Identity & Action Bar (Reddit Overlapping Crest + Clean Academic Typography) */}
      <div className="px-5 sm:px-7 pb-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Overlapping Avatar + Title */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 min-w-0 flex-1">
            {/* The Overlapping Hero Crest (ONLY the avatar has negative margin pulling it up) */}
            <div className="-mt-12 sm:-mt-16 md:-mt-18 shrink-0 relative z-10">
              <div className="relative group/logo h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-2xl sm:rounded-3xl bg-background dark:bg-slate-900 border-4 border-background dark:border-slate-900 ring-2 ring-border/60 shadow-xl flex items-center justify-center text-primary overflow-hidden transition-transform duration-200 group-hover/header:scale-[1.02]">
                {forum.logoUrl ? (
                  <img
                    src={forum.logoUrl}
                    alt={`${forum.name} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center">
                    <Network className="h-9 w-9 sm:h-11 sm:w-11 md:h-12 md:w-12 stroke-[1.75] text-primary" />
                  </div>
                )}

                {/* Staff-only Edit Logo Hover Overlay */}
                {hasModAuthority && (
                  <button
                    type="button"
                    onClick={() => handleOpenEdit("logo")}
                    className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer text-[10px] sm:text-xs font-semibold gap-1 backdrop-blur-2xs"
                    title="Edit community logo"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Change</span>
                  </button>
                )}
              </div>
            </div>

            {/* Title, Subject Code & Meta (Completely below banner, clean and unobstructed) */}
            <div className="space-y-1.5 min-w-0 flex-1 pt-1 sm:pt-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground truncate drop-shadow-2xs">
                  {forum.name}
                </h1>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/25 shadow-2xs tracking-wide">
                  {forum.code}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground font-medium flex-wrap">
                <span className="flex items-center gap-1.5 text-foreground/80 font-semibold">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {formattedCount} enrolled
                </span>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-muted-foreground">Moderators:</span>
                  {moderators.length > 0 ? (
                    moderators.map((m) => (
                      <span key={m.userId} className="text-foreground font-semibold">
                        @{m.handle || m.fullName?.toLowerCase().replace(/\s+/g, "_") || "mod"}
                      </span>
                    ))
                  ) : (
                    <span className="italic text-muted-foreground/75">None assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Pin option only when user is NOT already enrolled */}
          {!isEnrolled && onTogglePin && (
            <div className="pt-1 sm:pt-2 shrink-0">
              <Button
                type="button"
                variant={isPinned ? "secondary" : "outline"}
                size="sm"
                onClick={onTogglePin}
                className={`h-8 sm:h-9 gap-1.5 text-xs font-semibold shadow-xs cursor-pointer ${
                  isPinned
                    ? "bg-primary/15 text-primary border-primary/30 hover:bg-primary/25"
                    : "bg-background/80 dark:bg-slate-900/80 border-border/80 text-muted-foreground hover:text-foreground"
                }`}
                title={isPinned ? "Unpin forum from sidebar" : "Pin forum to sidebar"}
              >
                <Pin className={`h-3.5 w-3.5 ${isPinned ? "fill-current text-primary" : ""}`} />
                <span>{isPinned ? "Pinned" : "Pin Forum"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Optional Subject Description for Academic Context */}
        {forum.description && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
            {forum.description}
          </p>
        )}
      </div>

      {/* Staff Image Edit Modal */}
      {hasModAuthority && (
        <CommunityImageEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          forum={forum}
          defaultTab={dialogTab}
          isMock={isMock}
          onSaved={(updated) => {
            if (onForumUpdated) {
              onForumUpdated(updated);
            }
          }}
        />
      )}
    </div>
  );
}
