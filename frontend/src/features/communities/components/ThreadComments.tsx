/**
 * @file ThreadComments.tsx
 * @description Dialog modal for viewing thread comments and replying.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { MessageSquare, Send, Loader2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post, Comment } from "../services/types";
import { communitiesService } from "../services";

interface ThreadCommentsProps {
  post: Post | null;
  isOpen: boolean;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export function ThreadComments({
  post,
  isOpen,
  onClose,
  onCommentAdded,
}: ThreadCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!post || !isOpen) return;

    let isMounted = true;
    setIsLoading(true);

    communitiesService.getComments(post.id).then((result) => {
      if (isMounted) {
        if (result.data) {
          setComments(result.data);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [post, isOpen]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const res = await communitiesService.createComment(post.id, replyText.trim());
      if (res.data) {
        setComments((prev) => [...prev, res.data]);
        setReplyText("");
        onCommentAdded?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{post.authorName || post.authorHandle || "Anonymous"}</span>
            <span>•</span>
            <span>{post.replyCount} replies</span>
          </div>
          <DialogTitle className="text-base sm:text-lg leading-snug">
            {post.title}
          </DialogTitle>
          {post.body && (
            <p className="text-xs sm:text-sm text-muted-foreground bg-muted/40 p-3 rounded-lg border">
              {post.body}
            </p>
          )}
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No replies yet. Be the first to share an answer or insight!
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3 text-xs"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  {comment.authorAvatarUrl && (
                    <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName || "User"} />
                  )}
                  <AvatarFallback className="text-[10px] bg-secondary font-semibold">
                    {(comment.authorName || comment.authorHandle || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      {comment.authorName || comment.authorHandle || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment input footer */}
        <form onSubmit={handleSendReply} className="p-3 border-t bg-muted/20 flex gap-2 items-end">
          <Textarea
            placeholder="Write a reply..."
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="text-xs resize-none min-h-[48px]"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!replyText.trim() || isSubmitting}
            className="h-9 px-3 shrink-0"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

