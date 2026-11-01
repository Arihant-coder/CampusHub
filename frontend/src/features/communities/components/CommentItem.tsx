/**
 * @file CommentItem.tsx
 * @description Single comment component with Reddit-style compact nesting, [⊖] and [⊕] collapse controls, 12-level depth ceiling, and 1-2 WebP image attachments.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Send,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
  MoreHorizontal,
  Flag,
  Copy,
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
import { FormattedText } from "./FormattedText";
import { RichContentEditor } from "./RichContentEditor";
import { processCommunityImage } from "../utils/imagePipeline";
import { useImageViewer } from "@/lib/image-viewer-context";
import { useAuth } from "@/lib/auth-context";
import { canModerate } from "@/shared/user";
import { toast } from "sonner";
import { communitiesService } from "../services";
import type { Comment } from "../services/types";

// Reddit-style crisp circular minus icon [⊖]
function RedditMinusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="8" cy="8" r="6.25" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Reddit-style crisp circular plus icon [⊕]
function RedditPlusIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <circle cx="8" cy="8" r="6.25" />
      <line x1="4.5" y1="8" x2="11.5" y2="8" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="4.5" x2="8" y2="11.5" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Helper to count all nested descendant replies for the Reddit-style collapsed badge
function countDescendants(c: Comment): number {
  if (!c.children || c.children.length === 0) return 0;
  return c.children.reduce((acc, child) => acc + 1 + countDescendants(child), 0);
}

interface CommentItemProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
  subjectId?: string;
  moderatorIds?: string[];
  onReply: (parentId: string, body: string, images?: string[]) => Promise<void>;
  onVoteComment?: (commentId: string, vote: 1 | -1 | null) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export function CommentItem({
  comment,
  depth = 0,
  maxDepth = 12,
  subjectId,
  moderatorIds,
  onReply,
  onVoteComment,
  onDeleteComment,
}: CommentItemProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openImageViewer } = useImageViewer();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveSubjectId = subjectId || comment.subjectId;
  const isAuthorModerator = Boolean(
    moderatorIds?.includes(comment.authorId) ||
      comment.authorId === "mock-admin-uuid"
  );
  const canDeleteComment = Boolean(
    onDeleteComment &&
      user &&
      (user.id === comment.authorId || canModerate(user, effectiveSubjectId))
  );

  // 12-level depth ceiling check (0-indexed depths 0..11 = 12 total levels)
  const isMaxDepth = depth >= (maxDepth - 1);

  // Optimistic vote state (same color for up & down per user requirement)
  const [currentUserVote, setCurrentUserVote] = useState<1 | -1 | null>(
    comment.currentUserVote ?? null
  );
  const [upvotes, setUpvotes] = useState(comment.upvotes ?? 0);
  const [downvotes, setDownvotes] = useState(comment.downvotes ?? 0);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVote = currentUserVote === 1 ? null : 1;
    setCurrentUserVote(newVote);
    if (newVote === 1) {
      setUpvotes((v) => v + 1);
      if (currentUserVote === -1) setDownvotes((v) => Math.max(0, v - 1));
    } else {
      setUpvotes((v) => Math.max(0, v - 1));
    }
    if (onVoteComment) {
      await onVoteComment(comment.id, newVote);
    }
  };

  const handleDownvote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newVote = currentUserVote === -1 ? null : -1;
    setCurrentUserVote(newVote);
    if (newVote === -1) {
      setDownvotes((v) => v + 1);
      if (currentUserVote === 1) setUpvotes((v) => Math.max(0, v - 1));
    } else {
      setDownvotes((v) => Math.max(0, v - 1));
    }
    if (onVoteComment) {
      await onVoteComment(comment.id, newVote);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (replyImages.length >= 2) {
      toast.error("Comments can have at most 2 attached images.");
      e.target.value = "";
      return;
    }

    const file = files[0];
    try {
      setIsProcessingImage(true);
      const processed = await processCommunityImage(file, {
        maxDimension: 1200,
        maxSizeBytes: 1024 * 1024,
      });
      setReplyImages((prev) => [...prev, processed.dataUrl].slice(0, 2));
      toast.success(`Image converted to WebP (${Math.round(processed.sizeBytes / 1024)} KB)`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to process image");
    } finally {
      setIsProcessingImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (idx: number) => {
    setReplyImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting || isMaxDepth) return;

    try {
      setIsSubmitting(true);
      await onReply(comment.id, replyText.trim(), replyImages);
      setReplyText("");
      setReplyImages([]);
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChildren = comment.children && comment.children.length > 0;
  const descendantCount = hasChildren ? countDescendants(comment) : 0;

  // Format relative timestamp
  const formatTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // If collapsed: replace avatar with Reddit [⊕] icon at x = 0, followed by author & time & (X more)
  if (isCollapsed) {
    return (
      <div className={`relative ${depth === 0 ? "mt-5 first:mt-0" : "mt-3.5"}`}>
        <div
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer group/collapsed py-1 hover:text-foreground transition-colors"
          title="Expand comment thread"
        >
          {/* Reddit [⊕] icon positioned in place of the 24px avatar */}
          <div className="h-6 w-6 shrink-0 flex items-center justify-center text-muted-foreground group-hover/collapsed:text-foreground transition-colors">
            <RedditPlusIcon className="h-4 w-4" />
          </div>

          <span className="font-semibold text-foreground group-hover/collapsed:underline">
            {comment.authorName || comment.authorHandle || "Anonymous"}
          </span>
          {isAuthorModerator && (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-1 py-0.2">
              MOD
            </span>
          )}
          <span>•</span>
          <span className="text-[11px]">{formatTime(comment.createdAt)}</span>
          {descendantCount > 0 && (
            <span className="text-[11px] text-muted-foreground/75 font-normal">
              ({descendantCount} more)
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${depth === 0 ? "mt-5 first:mt-0" : "mt-3.5"}`}>
      {/* Header Row: Avatar + Name + Time */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground select-none relative z-10 flex-wrap">
        <Avatar
          className="h-6 w-6 shrink-0 relative z-10 bg-background cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (comment.authorHandle) navigate(`/u/${comment.authorHandle}`);
          }}
        >
          {comment.authorAvatarUrl && (
            <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName || "User"} />
          )}
          <AvatarFallback className="text-[9px] bg-secondary font-semibold">
            {(comment.authorName || comment.authorHandle || "U").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <span
          onClick={(e) => {
            e.stopPropagation();
            if (comment.authorHandle) navigate(`/u/${comment.authorHandle}`);
          }}
          className="font-semibold text-foreground hover:underline cursor-pointer"
        >
          {comment.authorName || "Anonymous"}
        </span>
        {comment.authorHandle && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (comment.authorHandle) navigate(`/u/${comment.authorHandle}`);
            }}
            className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
          >
            @{comment.authorHandle}
          </span>
        )}
        {isAuthorModerator && (
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded px-1 py-0.2">
            MOD
          </span>
        )}
        <span>•</span>
        <span className="text-[11px]">{formatTime(comment.createdAt)}</span>
      </div>

      {/* Comment Body & Optional Attachments (up to 2) */}
      <div className="pl-7 pt-1.5 text-xs sm:text-sm text-foreground/90 leading-relaxed">
        <FormattedText content={comment.body} />
        {comment.images && comment.images.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {comment.images.slice(0, 2).map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`Attachment ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  openImageViewer({
                    images: comment.images!,
                    initialIndex: idx,
                    title: `Image from ${comment.authorName || comment.authorHandle || "User"}`,
                  });
                }}
                className="max-h-48 max-w-xs rounded-lg border object-cover shadow-2xs cursor-zoom-in hover:opacity-95 transition-opacity"
                loading="lazy"
                title="Click to expand full screen"
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Row matching Reddit: [⊖] at x = 0 aligned with thread line, followed by [↑ vote ↓] [Reply] [Share] */}
      <div className="mt-2 flex items-center gap-2 select-none">
        {/* Reddit-style [⊖] button positioned in the 24px avatar column */}
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="h-6 w-6 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative z-20 bg-background"
          title="Collapse thread"
        >
          <RedditMinusIcon className="h-4 w-4" />
        </button>

        {/* Voting Buttons (clean, borderless, close together) */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleUpvote}
            className={`p-1 rounded-full transition-colors hover:bg-muted ${
              currentUserVote === 1
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Upvote"
          >
            <ArrowBigUp
              className={`h-4 w-4 ${currentUserVote === 1 ? "fill-primary" : ""}`}
            />
          </button>

          <span
            className={`min-w-[14px] text-center text-xs font-semibold select-none ${
              currentUserVote !== null ? "text-primary" : "text-foreground"
            }`}
          >
            {upvotes - downvotes}
          </span>

          <button
            type="button"
            onClick={handleDownvote}
            className={`p-1 rounded-full transition-colors hover:bg-muted ${
              currentUserVote === -1
                ? "text-primary font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Downvote"
          >
            <ArrowBigDown
              className={`h-4 w-4 ${currentUserVote === -1 ? "fill-primary" : ""}`}
            />
          </button>
        </div>

        {/* Reply Button (Hidden or disabled if max 12 levels reached) */}
        {isMaxDepth ? (
          <span className="text-[10px] text-muted-foreground/50 italic px-2 py-1 select-none">
            Max depth reached
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/60 transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            <span>Reply</span>
          </button>
        )}

        {/* Share Button */}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            toast.success("Comment link copied to clipboard!");
          }}
          className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/60 transition-colors cursor-pointer"
          title="Copy link"
        >
          <Share2 className="h-3 w-3" />
          <span>Share</span>
        </button>

        {/* Comment Options Menu (Tucks away delete for staff/authors, report, copy) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard?.writeText(comment.body);
                toast.success("Comment text copied to clipboard!");
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Text</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  if (communitiesService.createReport) {
                    await communitiesService.createReport({
                      subjectId: effectiveSubjectId || "cs301",
                      targetType: "comment",
                      targetId: comment.id,
                      reason: "Reported as inappropriate or violating community guidelines.",
                    });
                  }
                  toast.success("Comment reported to community moderators.");
                } catch {
                  toast.error("Failed to submit report.");
                }
              }}
              className="cursor-pointer gap-2 text-xs"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Report</span>
            </DropdownMenuItem>
            {canDeleteComment && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteComment?.(comment.id)}
                  className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline Reply Editor Box (Single rounded rectangle box) */}
      {isReplying && !isMaxDepth && (
        <div className="pl-7 mt-2">
          <RichContentEditor
            value={replyText}
            onChange={setReplyText}
            placeholder={`Reply to ${comment.authorName || comment.authorHandle || "User"}...`}
            compact={true}
            autoFocus={true}
            attachments={
              replyImages.length > 0 && (
                <div className="flex gap-2 px-3 pb-2 pt-0.5">
                  {replyImages.map((img, idx) => (
                    <div key={idx} className="relative group/thumb">
                      <img
                        src={img}
                        alt="Reply attachment"
                        className="h-14 w-14 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            }
            footer={
              <>
                {/* Attach Image button (limit 2) */}
                <label
                  className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1 rounded hover:bg-muted/80 transition-colors ${
                    replyImages.length >= 2 || isProcessingImage ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {isProcessingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  <span className="text-[11px] font-medium">
                    {replyImages.length > 0 ? `${replyImages.length}/2 Images` : "Image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={replyImages.length >= 2 || isProcessingImage}
                    className="hidden"
                  />
                </label>

                {/* Cancel & Save/Reply Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText("");
                      setReplyImages([]);
                    }}
                    className="h-7 text-xs px-3 rounded-full hover:bg-muted font-medium"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || isSubmitting || isProcessingImage}
                    className="h-7 text-xs px-3.5 rounded-full gap-1 font-semibold"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                    <span>Reply</span>
                  </Button>
                </div>
              </>
            }
          />
        </div>
      )}

      {/* Reddit-style Recursive Nested Children with clean vertical thread line */}
      {hasChildren && (
        <div className="relative pl-6 space-y-3.5 mt-2">
          {/* Thread Line: Runs down the left margin (at x = 11px, directly under the parent's [⊖] button) */}
          <div
            onClick={() => setIsCollapsed(true)}
            className="absolute top-1.5 bottom-2.5 left-[11px] w-[2px] bg-border/60 hover:bg-primary transition-colors cursor-pointer rounded-full z-0"
            title="Click to collapse thread"
          />

          {comment.children!.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              subjectId={effectiveSubjectId}
              moderatorIds={moderatorIds}
              onReply={onReply}
              onVoteComment={onVoteComment}
              onDeleteComment={onDeleteComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
