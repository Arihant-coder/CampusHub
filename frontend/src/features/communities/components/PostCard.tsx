/**
 * @file PostCard.tsx
 * @description Card component for previewing discussion threads with upvoting, carousel preview, comment count, and card-level moderation actions.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Clock,
  MoreVertical,
  Copy,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReportDialog } from "./ReportDialog";
import { ImageCarousel } from "./ImageCarousel";
import { useAuth } from "@/lib/auth-context";
import { canModerate } from "@/shared/user";
import { communitiesService } from "../services";
import { toast } from "sonner";
import type { Post } from "../services/types";

interface PostCardProps {
  post: Post;
  onVote: (postId: string, vote: 1 | -1 | null) => void;
  highlightQuery?: string;
  onDeletePost?: (postId: string) => void;
}

function HighlightedTitle({ title, query }: { title: string; query?: string }) {
  if (!query || !query.trim()) {
    return <>{title}</>;
  }

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) return <>{title}</>;

  const regex = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = title.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-primary/20 text-foreground font-semibold px-0.5 rounded-xs"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function PostCard({ post, onVote, highlightQuery, onDeletePost }: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const canDelete = Boolean(
    user && (user.id === post.authorId || canModerate(user, post.subjectId))
  );
  const canReport = Boolean(user && user.id !== post.authorId);

  const handleOpenPost = () => {
    navigate(`/communities/${post.subjectId}/post/${post.id}`);
  };

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.authorHandle) {
      navigate(`/u/${post.authorHandle}`);
    }
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/communities/${post.subjectId}/post/${post.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Post link copied to clipboard.");
  };

  const handleOpenReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReportDialog(true);
  };

  const handleOpenDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (communitiesService.deletePost) {
        await communitiesService.deletePost(post.id, post.images);
      }
      toast.success("Post deleted.");
      setShowDeleteConfirm(false);
      onDeletePost?.(post.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVote = post.currentUserVote === 1 ? null : 1;
    onVote(post.id, newVote);
  };

  const handleDownvote = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVote = post.currentUserVote === -1 ? null : -1;
    onVote(post.id, newVote);
  };

  // Format relative timestamp
  const formatTime = (isoString: string) => {
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

  const postImages = post.images && post.images.length > 0
    ? post.images
    : post.imageUrl
    ? [post.imageUrl]
    : [];

  return (
    <div
      onClick={handleOpenPost}
      className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-xs cursor-pointer select-none space-y-3"
    >
      {/* Author and metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-6 w-6 cursor-pointer" onClick={handleAuthorClick}>
            {post.authorAvatarUrl && <AvatarImage src={post.authorAvatarUrl} alt={post.authorName || "User"} />}
            <AvatarFallback className="text-[10px] bg-secondary font-semibold">
              {(post.authorName || post.authorHandle || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span onClick={handleAuthorClick} className="font-medium text-foreground hover:underline cursor-pointer">
            {post.authorName || "Anonymous"}
          </span>
          {post.authorHandle && (
            <span onClick={handleAuthorClick} className="text-xs text-muted-foreground hover:underline cursor-pointer">
              @{post.authorHandle}
            </span>
          )}
          {post.authorRole === "admin" && (
            <span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300">
              Admin
            </span>
          )}
          {post.authorRole === "moderator" && (
            <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
              Moderator
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(post.createdAt)}</span>
          </div>

          {/* 3-Dot Dropdown Menu for Post Card */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                title="Post options"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MoreVertical className="h-3.5 w-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                <Copy className="mr-2 h-3.5 w-3.5" />
                <span>Copy Link</span>
              </DropdownMenuItem>
              {canReport && (
                <DropdownMenuItem onClick={handleOpenReport} className="cursor-pointer">
                  <AlertCircle className="mr-2 h-3.5 w-3.5" />
                  <span>Report Post</span>
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleOpenDelete}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    <span>Delete Post</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Post Title */}
      <div>
        <h3 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          <HighlightedTitle title={post.title} query={highlightQuery} />
        </h3>
      </div>

      {/* Image Carousel (Renders above body text if images exist) */}
      {postImages.length > 0 && (
        <div className="pt-0.5">
          <ImageCarousel
            images={postImages}
            title={post.title}
            aspectClass="max-h-[380px] min-h-[200px]"
          />
        </div>
      )}

      {/* Body preview (optional) */}
      {post.body && post.body.trim().length > 0 && (
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">
          {post.body}
        </p>
      )}

      {/* Post Footer Actions: Upvote/Downvote & Comments (Geometrically similar capsules) */}
      <div className="flex items-center gap-2.5 pt-1">
        {/* Voting capsule */}
        <div
          className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-secondary/40 px-1 text-xs select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleUpvote}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 ${
              post.currentUserVote === 1
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Upvote"
          >
            <ArrowBigUp className={`h-4 w-4 ${post.currentUserVote === 1 ? "fill-primary" : ""}`} />
          </button>
          <span
            className={`min-w-[1.25rem] px-1 text-center text-xs font-semibold ${
              post.currentUserVote !== null
                ? "text-primary"
                : "text-foreground"
            }`}
          >
            {post.upvotes - post.downvotes}
          </span>

          <button
            type="button"
            onClick={handleDownvote}
            className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 ${
              post.currentUserVote === -1
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Downvote"
          >
            <ArrowBigDown className={`h-4 w-4 ${post.currentUserVote === -1 ? "fill-primary" : ""}`} />
          </button>
        </div>

        {/* Reply Count Capsule (matching exact geometry, height, border, and background) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPost();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors cursor-pointer select-none"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{post.replyCount} comments</span>
        </button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Post"
        description={
          <>
            Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{post.title}&rdquo;</span>? This action cannot be undone.
          </>
        }
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />

      <ReportDialog
        open={showReportDialog}
        onOpenChange={setShowReportDialog}
        subjectId={post.subjectId}
        targetType="post"
        targetId={post.id}
        targetTitle={post.title}
      />
    </div>
  );
}
