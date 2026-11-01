/**
 * @file ProfilePage.tsx
 * @description Public profile view at /u/:handle with dynamic role badges, privacy controls, and post activity.
 * @owner Platform Core Team
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  Lock,
  Globe,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Loader2,
  ArrowLeft,
  MessageSquare,
  ArrowBigUp,
  Clock,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { profileService } from "./services";
import { toast } from "sonner";
import type { PublicUserProfile } from "./types";
import type { Post } from "@/shared/communities";

function getInitials(name?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return "U";
}

export function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const { user, setAuthUser } = useAuth();

  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);

  const isOwnProfile = Boolean(user && profile && (user.id === profile.id || user.handle.toLowerCase() === profile.handle.toLowerCase()));
  const isViewerAdmin = user?.role === "admin";
  const canViewPosts = isOwnProfile || isViewerAdmin || (profile && !profile.isPrivate);

  const loadData = useCallback(async () => {
    if (!handle) return;
    setIsLoading(true);
    const res = await profileService.getProfileByHandle(handle);

    if (res.error || !res.data) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setProfile(res.data);

    // If allowed to view posts, load authored posts
    const allowed = (user && (user.id === res.data.id || user.handle.toLowerCase() === res.data.handle.toLowerCase())) ||
      user?.role === "admin" ||
      !res.data.isPrivate;

    if (allowed) {
      const postsRes = await profileService.getUserPosts(res.data.id);
      setPosts(postsRes.data || []);
    }
    setIsLoading(false);
  }, [handle, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTogglePrivacy = async (checked: boolean) => {
    if (!profile || !user) return;
    setIsTogglingPrivacy(true);
    const res = await profileService.togglePrivacy(user.id, checked);
    setIsTogglingPrivacy(false);

    if (res.error) {
      toast.error("Failed to update privacy preference.");
      return;
    }

    setProfile((prev) => (prev ? { ...prev, isPrivate: checked } : null));
    setAuthUser({
      ...user,
      isPrivate: checked,
    });
    toast.success(checked ? "Profile set to Private." : "Profile set to Public.");
  };

  const formatJoinedDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours < 1) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, minutes)}m ago`;
    }
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-12 text-center">
        <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The user @{handle} does not exist or may have been deleted.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="cursor-pointer">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back
        </Button>
      </div>

      {/* Profile Header Card */}
      <div className="rounded-2xl border bg-card p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-2 border-border shadow-xs shrink-0">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.fullName || profile.handle} />}
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {getInitials(profile.fullName)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">
                  {profile.fullName || profile.handle}
                </h1>
                <span className="font-mono text-sm text-muted-foreground">
                  @{profile.handle}
                </span>
              </div>

              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {profile.role === "admin" ? (
                  <Badge variant="destructive" className="text-xs gap-1 py-0.5">
                    <ShieldAlert className="size-3" />
                    Admin Staff
                  </Badge>
                ) : profile.moderatedSubjects.length > 0 ? (
                  <Badge variant="outline" className="text-xs gap-1 border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10 py-0.5">
                    <ShieldCheck className="size-3" />
                    Moderator
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs gap-1 py-0.5">
                    <GraduationCap className="size-3" />
                    Student
                  </Badge>
                )}

                {profile.isPrivate ? (
                  <Badge variant="outline" className="text-[11px] gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                    <Lock className="size-2.5" />
                    Private Profile
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] gap-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                    <Globe className="size-2.5" />
                    Public Profile
                  </Badge>
                )}
              </div>

              {/* Joined Date */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Joined {formatJoinedDate(profile.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Owner Privacy Toggle Control */}
          {isOwnProfile && (
            <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 self-start shrink-0">
              <div className="space-y-0.5">
                <Label htmlFor="privacy-toggle" className="text-xs font-semibold cursor-pointer">
                  Private Profile
                </Label>
                <p className="text-[10px] text-muted-foreground max-w-[180px] leading-snug">
                  Hide your activity and posts from other students.
                </p>
              </div>
              <Switch
                id="privacy-toggle"
                checked={profile.isPrivate}
                disabled={isTogglingPrivacy}
                onCheckedChange={handleTogglePrivacy}
              />
            </div>
          )}
        </div>

        {/* Moderation Scope Display */}
        {profile.moderatedSubjects.length > 0 && (
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Moderated Communities
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.moderatedSubjects.map((sub) => (
                <span
                  key={sub.id}
                  onClick={() => navigate(`/communities/${sub.id}`)}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-background border px-2.5 py-1 rounded-md cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <span className="font-mono font-bold text-primary">{sub.code}</span>
                  <span className="text-muted-foreground">• {sub.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Posts / Activity or Private Lock */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-foreground">
          Discussions & Posts
        </h2>

        {!canViewPosts ? (
          /* Locked Privacy Notice */
          <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-base font-bold text-foreground">This Profile is Private</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              @{profile.handle} has set their profile to private. Authored discussions and activity history are hidden.
            </p>
          </div>
        ) : posts.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border bg-card p-10 text-center space-y-2">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-foreground">No discussions posted yet</h3>
            <p className="text-xs text-muted-foreground">
              @{profile.handle} has not started any discussions in communities yet.
            </p>
          </div>
        ) : (
          /* List of Posts */
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                onClick={() => navigate(`/communities/${post.subjectId}/post/${post.id}`)}
                className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer select-none space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono font-medium text-primary">
                    {post.subjectId.toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatRelativeTime(post.createdAt)}</span>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                  {post.title}
                </h3>

                {post.body && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.body}
                  </p>
                )}

                <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 font-semibold text-foreground">
                    <ArrowBigUp className="h-4 w-4" />
                    <span>{post.upvotes - post.downvotes}</span>
                  </div>
                  <div className="flex items-center gap-1 font-medium">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{post.replyCount} comments</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

