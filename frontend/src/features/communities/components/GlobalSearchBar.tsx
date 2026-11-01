/**
 * @file GlobalSearchBar.tsx
 * @description Global omni-search header bar allowing instant discovery across all communities and posts.
 * @owner Communities Team
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Users, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/lib/use-debounce";
import { communitiesService } from "../services";
import type { SubjectForum, Post } from "../services/types";

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || !query.trim()) return <>{text}</>;
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (terms.length === 0) return <>{text}</>;
  const regex = new RegExp(`(${terms.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <mark
            key={index}
            className="bg-primary/25 text-foreground font-semibold px-0.5 rounded-xs"
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

export function GlobalSearchBar() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    forums: SubjectForum[];
    posts: (Post & { forumName?: string })[];
  }>({ forums: [], posts: [] });

  const debouncedQuery = useDebounce(query, 250);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ forums: [], posts: [] });
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    communitiesService.searchGlobal(debouncedQuery).then((res) => {
      if (isMounted) {
        if (res.data) {
          setResults(res.data);
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const handleSelectForum = (forumId: string) => {
    navigate(`/communities/${forumId}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectPost = (subjectId: string, postId: string) => {
    navigate(`/communities/${subjectId}/post/${postId}`);
    setIsOpen(false);
    setQuery("");
  };

  const hasResults = results.forums.length > 0 || results.posts.length > 0;
  const isSearching = query.trim().length > 0 && (query.trim() !== debouncedQuery.trim() || isLoading);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg md:max-w-xl lg:max-w-2xl">
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search across all subjects, notes, and communities..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="h-9 w-full pl-9 pr-9 text-xs sm:text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background border-muted-foreground/20 focus:border-primary shadow-2xs rounded-lg transition-all"
        />

        {/* Right Action Icons: Spinner / Clear Button */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto">
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults({ forums: [], posts: [] });
                inputRef.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Results Popover */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover text-popover-foreground rounded-xl border border-border shadow-xl overflow-hidden max-h-[460px] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100">
          {isSearching && !hasResults ? (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Searching communities and posts...</span>
            </div>
          ) : !isSearching && !hasResults ? (
            <div className="p-8 text-center space-y-1">
              <p className="text-sm font-medium text-foreground">
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                Try searching for a subject name (e.g. Computer Networks), code (e.g. CS301), or a question topic.
              </p>
            </div>
          ) : (
            <div className={`p-2 space-y-3 transition-opacity duration-150 ${isSearching ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
              {/* Group 1: Matching Communities / Subjects */}
              {results.forums.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                    Communities ({results.forums.length})
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.forums.map((forum) => (
                      <div
                        key={forum.id}
                        onClick={() => handleSelectForum(forum.id)}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-7 w-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              <HighlightMatch text={forum.name} query={query} />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {forum.memberCount} members • {forum.code}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Group 2: Matching Posts Across Communities */}
              {results.posts.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                    Discussions &amp; Posts ({results.posts.length})
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {results.posts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => handleSelectPost(post.subjectId, post.id)}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-muted/80 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="h-7 w-7 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center shrink-0">
                            <MessageSquare className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              <HighlightMatch text={post.title} query={query} />
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                              {post.forumName && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 font-normal">
                                  {post.forumName}
                                </Badge>
                              )}
                              <span>{post.authorName || post.authorHandle || "Anonymous"}</span>
                              <span>•</span>
                              <span>{post.upvotes} upvotes</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
