/**
 * @file CommentTree.tsx
 * @description Hierarchical tree builder and renderer for up to 12 nested comment levels.
 * @owner Communities Team
 */

import React, { useMemo } from "react";
import { MessageSquareDashed } from "lucide-react";
import { CommentItem } from "./CommentItem";
import type { Comment } from "../services/types";

interface CommentTreeProps {
  comments: Comment[];
  subjectId?: string;
  onReply: (parentId: string, body: string, images?: string[]) => Promise<void>;
  onVoteComment?: (commentId: string, vote: 1 | -1 | null) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

export function CommentTree({
  comments,
  subjectId,
  onReply,
  onVoteComment,
  onDeleteComment,
}: CommentTreeProps) {
  // Build nested hierarchical tree from flat comment list
  const commentTree = useMemo(() => {
    const commentMap = new Map<string, Comment & { children: Comment[] }>();
    const roots: (Comment & { children: Comment[] })[] = [];

    // Initialize all comments in map
    comments.forEach((c) => {
      commentMap.set(c.id, { ...c, children: [] });
    });

    // Link children to parents
    comments.forEach((c) => {
      const node = commentMap.get(c.id)!;
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [comments]);

  if (comments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-2 bg-muted/10">
        <MessageSquareDashed className="mx-auto h-7 w-7 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">No comments yet</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Be the first to share an answer, thought, or helpful insight!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {commentTree.map((rootComment) => (
        <CommentItem
          key={rootComment.id}
          comment={rootComment}
          depth={0}
          maxDepth={12}
          subjectId={subjectId}
          onReply={onReply}
          onVoteComment={onVoteComment}
          onDeleteComment={onDeleteComment}
        />
      ))}
    </div>
  );
}

