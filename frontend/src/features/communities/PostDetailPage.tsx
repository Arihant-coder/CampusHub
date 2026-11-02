/**
 * @file PostDetailPage.tsx
 * @description Dedicated Reddit-style full page view for an individual discussion post.
 * @owner Communities Team
 */

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Loader2,
  Image as ImageIcon,
  X,
  Trash2,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageCarousel } from "./components/ImageCarousel";
import { FormattedText } from "./components/FormattedText";
import { RichContentEditor } from "./components/RichContentEditor";
import { CommentTree } from "./components/CommentTree";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReportDialog } from "./components/ReportDialog";
import { toast } from "sonner";
import { communitiesService } from "./services";
import { processCommunityImage } from "./utils/imagePipeline";
import { useAuth } from "@/lib/auth-context";
import { canModerate } from "@/shared/user";
import type { Post, Comment, SubjectForum, CommunityModerator } from "./services/types";

export default function PostDetailPage() {
  const { subjectId, postId } = useParams<{ subjectId?: string; postId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [forum, setForum] = useState<SubjectForum | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [communityModerators, setCommunityModerators] = useState<CommunityModerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthorModerator = Boolean(
    post && (
      communityModerators.some((m) => m.userId === post.authorId) ||
      post.authorId === "mock-admin-uuid"
    )
  );

  const moderatorIds = useMemo(
    () => communityModerators.map((m) => m.userId),
    [communityModerators]
  );

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Post link copied to clipboard!");
  };

  const [showDeletePostConfirm, setShowDeletePostConfirm] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const canDeletePost = Boolean(
    user && post && (user.id === post.authorId || canModerate(user, post.subjectId))
  );
  const canReportPost = Boolean(user && post && user.id !== post.authorId);

  const handleConfirmDeletePost = async () => {
    if (!post) return;
    try {
      setIsDeletingPost(true);
      if (communitiesService.deletePost) {
        await communitiesService.deletePost(post.id, post.images);
      }
      toast.success("Post deleted.");
      setShowDeletePostConfirm(false);
      navigate(`/communities/${post.subjectId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    try {
      setIsDeletingComment(true);
      if (communitiesService.deleteComment) {
        await communitiesService.deleteComment(commentToDeleteId);
      }
      setComments((prev) => {
        const removeRecursive = (list: Comment[]): Comment[] => {
          return list
            .filter((c) => c.id !== commentToDeleteId)
            .map((c) => ({
              ...c,
              children: c.children ? removeRecursive(c.children) : [],
            }));
        };
        return removeRecursive(prev);
      });
      toast.success("Comment deleted.");
      setCommentToDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete comment.");
    } finally {
      setIsDeletingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setCommentToDeleteId(commentId);
  };

  // Top-level comment box state
  const [commentText, setCommentText] = useState("");
  const [commentImages, setCommentImages] = useState<string[]>([]);
  const [isProcessingCommentImages, setIsProcessingCommentImages] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCommentBoxExpanded, setIsCommentBoxExpanded] = useState(false);

  const handleCancelComment = () => {
    setCommentText("");
    setCommentImages([]);
    setIsCommentBoxExpanded(false);
  };

  // Voting state (same-color for up and down per requirement)
  const [currentUserVote, setCurrentUserVote] = useState<1 | -1 | null>(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);

  // 1. Load Post, Forum & Comments
  useEffect(() => {
    if (!postId) return;
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      communitiesService.getPost(postId),
      communitiesService.getComments(postId),
      communitiesService.getSubjectForums(),
    ]).then(([postRes, commentsRes, forumsRes]) => {
      if (!isMounted) return;

      if (postRes.data) {
        setPost(postRes.data);
        setCurrentUserVote(postRes.data.currentUserVote ?? null);
        setUpvotes(postRes.data.upvotes);
        setDownvotes(postRes.data.downvotes);

        const currentSubjectId = subjectId || postRes.data.subjectId;
        if (forumsRes.data) {
          const matched = forumsRes.data.find((f) => f.id === currentSubjectId);
          setForum(matched || null);
        }

        if (currentSubjectId && communitiesService.getCommunityModerators) {
          communitiesService.getCommunityModerators(currentSubjectId).then((modRes) => {
            if (isMounted && modRes.data) {
              setCommunityModerators(modRes.data);
            }
          });
        }
      }

      if (commentsRes.data) {
        setComments(commentsRes.data);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [postId, subjectId]);

  // Vote post handler (same color for upvote & downvote)
  const handleVote = async (newVote: 1 | -1 | null) => {
    if (!post) return;

    let nextVote: 1 | -1 | null = currentUserVote === newVote ? null : newVote;
    const prevVote = currentUserVote;

    setCurrentUserVote(nextVote);
    if (prevVote === 1) setUpvotes((v) => Math.max(0, v - 1));
    if (prevVote === -1) setDownvotes((v) => Math.max(0, v - 1));

    if (nextVote === 1) setUpvotes((v) => v + 1);
    if (nextVote === -1) setDownvotes((v) => v + 1);

    await communitiesService.votePost(post.id, nextVote);
  };

  const handleCommentImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 2 - commentImages.length;
    if (remaining <= 0) {
      toast.error("Maximum 2 images allowed per comment.");
      e.target.value = "";
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    setIsProcessingCommentImages(true);

    try {
      for (const file of toProcess) {
        try {
          const processed = await processCommunityImage(file, {
            maxDimension: 1600,
            maxSizeBytes: 1024 * 1024,
            initialQuality: 0.85,
          });
          setCommentImages((prev) => [...prev, processed.dataUrl]);
          toast.success(`Attached "${file.name}" (WebP)`);
        } catch (err: unknown) {
          toast.error((err as Error).message || `Failed to process "${file.name}".`);
        }
      }
    } finally {
      setIsProcessingCommentImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveCommentImage = (idx: number) => {
    setCommentImages((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit top-level comment
  const handleCreateTopLevelComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !commentText.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      const res = await communitiesService.createComment(
        post.id,
        commentText.trim(),
        null,
        commentImages
      );
      if (res.error) {
        toast.error(res.error.message || "Failed to submit comment.");
        return;
      }
      if (res.data) {
        setComments((prev) => [...prev, res.data]);
        setCommentText("");
        setCommentImages([]);
        setIsCommentBoxExpanded(false);
        setPost((p) => (p ? { ...p, replyCount: p.replyCount + 1 } : null));
        toast.success("Comment posted!");
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit reply to a comment (nested up to 12 levels)
  const handleReplyToComment = async (
    parentId: string,
    body: string,
    images?: string[]
  ) => {
    if (!post || !body.trim()) return;
    const res = await communitiesService.createComment(post.id, body.trim(), parentId, images);
    if (res.error) {
      toast.error(res.error.message || "Failed to submit reply.");
      throw new Error(res.error.message);
    }
    if (res.data) {
      setComments((prev) => [...prev, res.data]);
      setPost((p) => (p ? { ...p, replyCount: p.replyCount + 1 } : null));
      toast.success("Reply posted!");
    }
  };

  const handleVoteComment = async (commentId: string, vote: 1 | -1 | null) => {
    if (communitiesService.voteComment) {
      await communitiesService.voteComment(commentId, vote);
    }
  };

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

  const backUrl = forum ? `/communities/${forum.id}` : "/communities";

  const postImages = post?.images && post.images.length > 0
    ? post.images
    : post?.imageUrl
    ? [post.imageUrl]
    : [];

  return (
    <div className="min-h-full py-4 px-4 sm:px-6 lg:px-8">
      {/* Centered post container without outer card border */}
      <div className="w-full max-w-4xl mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : !post ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            Post not found or may have been deleted.
            <div className="mt-3">
              <Button size="sm" variant="outline" onClick={() => navigate(backUrl)}>
                Return to Community
              </Button>
            </div>
          </div>
        ) : (
          <article className="space-y-3">
            {/* Header Row: Back Button + Community Avatar & Details (stacked 2-line) + Actions */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Circular back button - shifted slightly left (-ml-2) so the arrow icon aligns with the title text */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(backUrl)}
                  className="-ml-2 h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                  title="Back to community"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>

                {/* Community avatar */}
                <Avatar
                  onClick={() => navigate(backUrl)}
                  className="h-8 w-8 shrink-0 rounded-full border cursor-pointer hover:opacity-90 transition-opacity"
                >
                  {forum?.imageUrl && (
                    <AvatarImage src={forum.imageUrl} alt={forum.name} className="object-cover" />
                  )}
                  <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                    {(forum?.code || "CH").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* 2-line stacked community & author meta */}
                <div className="flex flex-col min-w-0 leading-tight">
                  <button
                    type="button"
                    onClick={() => navigate(backUrl)}
                    className="text-left font-bold text-xs sm:text-sm text-foreground hover:underline truncate"
                  >
                    {forum ? `${forum.code} • ${forum.name}` : "Community"}
                  </button>
                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground truncate flex-wrap">
                    <span
                      onClick={() => {
                        if (post.authorHandle) navigate(`/u/${post.authorHandle}`);
                      }}
                      className="font-medium text-foreground/80 hover:underline cursor-pointer"
                    >
                      {post.authorName || "Anonymous"}
                    </span>
                    {post.authorHandle && (
                      <span
                        onClick={() => navigate(`/u/${post.authorHandle}`)}
                        className="text-muted-foreground hover:underline cursor-pointer"
                      >
                        @{post.authorHandle}
                      </span>
                    )}
                    {isAuthorModerator && (
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium"
                      >
                        Moderator
                      </Badge>
                    )}
                    <span>•</span>
                    <span>{formatTime(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="More options"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onClick={handleCopyLink}
                      className="cursor-pointer gap-2 text-xs"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </DropdownMenuItem>
                    {canReportPost && (
                      <DropdownMenuItem
                        onClick={() => setShowReportDialog(true)}
                        className="cursor-pointer gap-2 text-xs"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>Report Post</span>
                      </DropdownMenuItem>
                    )}
                    {canDeletePost && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeletePostConfirm(true)}
                          className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Post</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Title (Prominent, leading directly to media/content) */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-snug">
              {post.title}
            </h1>

            {/* IMAGES CAROUSEL: Directly above body text */}
            {postImages.length > 0 && (
              <div className="pt-0.5 flex justify-center">
                <ImageCarousel
                  images={postImages}
                  title={post.title}
                  aspectClass="max-h-[360px] sm:max-h-[420px] min-h-[180px] sm:min-h-[220px]"
                  className="w-full max-w-3xl rounded-xl overflow-hidden shadow-xs"
                />
              </div>
            )}

            {/* Body Text (optional) */}
            {post.body && post.body.trim().length > 0 && (
              <div className="text-sm sm:text-base text-foreground/90 leading-relaxed pt-1">
                <FormattedText content={post.body} />
              </div>
            )}

            {/* Action Bar (Upvote/Downvote pills, comments count, share - geometrically aligned) */}
            <div className="flex items-center gap-2.5 pt-2 border-b pb-3 select-none">
              {/* Vote Capsule */}
              <div className="inline-flex h-8 items-center rounded-lg border border-border/80 bg-secondary/40 px-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleVote(1)}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 ${
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
                  className={`min-w-[1.25rem] px-1 text-center text-xs font-semibold ${
                    currentUserVote !== null ? "text-primary" : "text-foreground"
                  }`}
                >
                  {upvotes - downvotes}
                </span>

                <button
                  type="button"
                  onClick={() => handleVote(-1)}
                  className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-background/80 ${
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

              {/* Comment Counter Capsule */}
              <div className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-3 text-xs font-medium text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{post.replyCount} comments</span>
              </div>

              {/* Share Button */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/70 hover:text-foreground transition-colors cursor-pointer"
                title="Copy link"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            </div>

            {/* Top-Level Add Comment Section (Reddit-style expandable single box) */}
            <div className="pt-2">
              {!isCommentBoxExpanded ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsCommentBoxExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setIsCommentBoxExpanded(true);
                    }
                  }}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 px-3.5 py-2.5 text-xs sm:text-sm text-muted-foreground hover:border-border transition-all cursor-text shadow-2xs select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-6 w-6 border border-border shrink-0">
                      {user?.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={user.fullName || "User"} />
                      )}
                      <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                        {(user?.fullName || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-muted-foreground/80 group-hover:text-foreground transition-colors">
                      What are your thoughts?
                    </span>
                  </div>

                  <span className="shrink-0 text-[11px] font-medium text-muted-foreground/60 hidden sm:inline">
                    Comment as <span className="font-semibold text-foreground/80">{user?.fullName || "Student"}</span>
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5 animate-in fade-in-50 duration-150">
                  <div className="text-xs font-medium text-muted-foreground px-0.5">
                    Comment as{" "}
                    <span className="text-foreground font-semibold">
                      {user?.fullName || "Student"}
                    </span>
                  </div>
                  <RichContentEditor
                    value={commentText}
                    onChange={setCommentText}
                    placeholder="What are your thoughts?"
                    compact={false}
                    autoFocus={true}
                    minHeight="min-h-[85px]"
                    attachments={
                      commentImages.length > 0 && (
                        <div className="flex gap-2 px-3 pb-2 pt-0.5">
                          {commentImages.map((img, idx) => (
                            <div key={idx} className="relative group/thumb">
                              <img
                                src={img}
                                alt="Comment attachment"
                                className="h-16 w-16 object-cover rounded-md border"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveCommentImage(idx)}
                                className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-90 hover:opacity-100 shadow-xs cursor-pointer"
                                title="Remove image"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    footer={
                      <>
                        <div className="flex items-center gap-2">
                          {commentImages.length < 2 && (
                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                multiple={false}
                                onChange={handleCommentImageUpload}
                                disabled={isProcessingCommentImages}
                                className="hidden"
                              />
                              {isProcessingCommentImages ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              ) : (
                                <ImageIcon className="h-3.5 w-3.5" />
                              )}
                              <span className="text-[11px] font-medium">
                                {commentImages.length > 0 ? `${commentImages.length}/2 Images` : "Attach image"}
                              </span>
                            </label>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelComment}
                            disabled={isSubmittingComment}
                            className="h-7 px-3 text-xs font-semibold rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            onClick={handleCreateTopLevelComment}
                            disabled={!commentText.trim() || isSubmittingComment || isProcessingCommentImages}
                            className="h-7 px-4 text-xs font-semibold rounded-full gap-1.5 cursor-pointer"
                          >
                            {isSubmittingComment ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MessageSquare className="h-3.5 w-3.5" />
                            )}
                            <span>Comment</span>
                          </Button>
                        </div>
                      </>
                    }
                  />
                </div>
              )}
            </div>

            {/* 12-Level Nested Comments Thread */}
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comments ({comments.length})
              </h3>
              <CommentTree
                comments={comments}
                subjectId={post.subjectId}
                moderatorIds={moderatorIds}
                onReply={handleReplyToComment}
                onVoteComment={handleVoteComment}
                onDeleteComment={handleDeleteComment}
              />
            </div>
          </article>
        )}
      </div>

      {post && (
        <>
          <ConfirmDialog
            open={showDeletePostConfirm}
            onOpenChange={setShowDeletePostConfirm}
            title="Delete Post"
            description={
              <>
                Are you sure you want to delete <span className="font-semibold text-foreground">&ldquo;{post.title}&rdquo;</span>? This cannot be undone.
              </>
            }
            confirmText="Delete"
            variant="destructive"
            isLoading={isDeletingPost}
            onConfirm={handleConfirmDeletePost}
          />

          <ConfirmDialog
            open={Boolean(commentToDeleteId)}
            onOpenChange={(open) => !open && setCommentToDeleteId(null)}
            title="Delete Comment"
            description="Are you sure you want to delete this comment? This cannot be undone."
            confirmText="Delete"
            variant="destructive"
            isLoading={isDeletingComment}
            onConfirm={handleConfirmDeleteComment}
          />

          <ReportDialog
            open={showReportDialog}
            onOpenChange={setShowReportDialog}
            subjectId={post.subjectId}
            targetType="post"
            targetId={post.id}
            targetTitle={post.title}
          />
        </>
      )}
    </div>
  );
}
