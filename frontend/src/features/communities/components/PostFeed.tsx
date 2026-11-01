/**
 * @file PostFeed.tsx
 * @description Feed component with sort controls, new post button, and list of post threads.
 * @owner Communities Team
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquareDashed, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "./PostCard";
import type { Post } from "../services/types";

interface PostFeedProps {
  posts: Post[];
  isLoading: boolean;
  subjectName: string;
  subjectId?: string;
  sortBy: "new" | "top" | "hot";
  onSortChange: (sort: "new" | "top" | "hot") => void;
  onVote: (postId: string, vote: 1 | -1 | null) => void;
  onRefresh?: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onClearSearch?: () => void;
  onDeletePost?: (postId: string) => void;
}

export function PostFeed({
  posts,
  isLoading,
  subjectName,
  subjectId,
  sortBy,
  onSortChange,
  onVote,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onDeletePost,
}: PostFeedProps) {
  const navigate = useNavigate();

  const sortLabels: Record<string, string> = {
    new: "New",
    top: "Top",
    hot: "Hot",
  };

  const handleOpenCreatePost = () => {
    if (subjectId) {
      navigate(`/communities/${subjectId}/new`);
    } else {
      navigate("/communities/new");
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar matching Image 2: [New ⌄] on left, [🔍 Search in {subjectName}...] in middle, [+ New Post] on right */}
      <div className="flex items-center gap-2.5 sm:gap-3 pt-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8.5 gap-1.5 text-xs font-medium shrink-0">
              <span>{sortLabels[sortBy]}</span>
              <span className="text-muted-foreground text-[10px]">▼</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-28">
            <DropdownMenuItem onClick={() => onSortChange("new")}>New</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("hot")}>Hot</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortChange("top")}>Top</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Community Body Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder={`Search in ${subjectName}...`}
            value={searchQuery || ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                onClearSearch?.();
              }
            }}
            className="h-8.5 w-full pl-8.5 pr-8 text-xs bg-muted/20 hover:bg-muted/40 focus:bg-background border-border/80 focus:border-primary shadow-2xs rounded-lg transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          size="sm"
          onClick={handleOpenCreatePost}
          className="h-8.5 gap-1.5 text-xs font-semibold shadow-xs shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Post</span>
        </Button>
      </div>

      {/* Active Search Filter Status */}
      {searchQuery && posts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3.5 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground truncate mr-2">
            <Search className="h-3 w-3 shrink-0" />
            <span className="shrink-0">Filtered by:</span>
            <span className="font-semibold text-foreground truncate">&ldquo;{searchQuery}&rdquo;</span>
            <span className="shrink-0 text-muted-foreground">
              ({posts.length} {posts.length === 1 ? "post" : "posts"})
            </span>
          </div>
          {onClearSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="h-5 px-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Feed list */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : posts.length === 0 ? (
        searchQuery ? (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
            <Search className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <h4 className="text-sm font-semibold text-foreground">
              No post titles matching &ldquo;{searchQuery}&rdquo;
            </h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              We couldn&apos;t find any discussion posts in {subjectName} with titles containing this search term.
            </p>
            {onClearSearch && (
              <Button
                size="sm"
                variant="outline"
                onClick={onClearSearch}
                className="mt-2 text-xs cursor-pointer"
              >
                Clear search filter
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
            <MessageSquareDashed className="mx-auto h-8 w-8 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">No discussions yet</h4>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first student to ask a question or share a tip in the {subjectName} community!
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenCreatePost}
              className="mt-2 text-xs"
            >
              Start a discussion
            </Button>
          </div>
        )
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onVote={onVote}
              highlightQuery={searchQuery}
              onDeletePost={onDeletePost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
