import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowRight,
  BookOpen,
  CalendarDays,
  MessageSquare,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/lib/auth-context";
import { useUserSubjects } from "@/lib/user-subjects-context";
import type { Post } from "@/shared/communities";
import { dashboardService } from "./services";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return "";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    enrolledSubjects,
    isLoading: loadingSubjects,
    openModal: openSubjectModal,
  } = useUserSubjects();

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [calendarMonth, setCalendarMonth] = useState<Date>(today);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDiscussions() {
      try {
        setLoadingPosts(true);
        const postsRes = await dashboardService.getHotDiscussions(5);
        if (isMounted && postsRes.data) {
          setHotPosts(postsRes.data);
        }
      } catch (err) {
        console.error("Failed to load hot discussions:", err);
      } finally {
        if (isMounted) {
          setLoadingPosts(false);
        }
      }
    }

    void loadDiscussions();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-full w-full min-w-0 bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Subjects & Calendar Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* My Subjects */}
          <Card className="flex flex-col border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden min-h-[340px]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BookOpen className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  My Subjects
                </CardTitle>
                <span className="text-xs text-muted-foreground font-medium">
                  {enrolledSubjects.length} enrolled
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openSubjectModal}
                className="h-8 gap-1.5 text-xs cursor-pointer"
                title="Add or remove enrolled subjects"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Manage Subjects</span>
              </Button>
            </CardHeader>

            <CardContent className="flex-1 p-4 sm:p-5 flex flex-col justify-center">
              {loadingSubjects ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Loading enrolled subjects...
                </div>
              ) : enrolledSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    No subjects enrolled yet
                  </h3>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
                    Select the courses you are attending this semester to access your study notes, communities, and subject tools.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={openSubjectModal}
                    className="mt-4 gap-1.5 cursor-pointer text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Select Subjects
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {enrolledSubjects.map((subject) => {
                    return (
                      <Link
                        key={subject.id}
                        to={`/subjects/${subject.id}`}
                        className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs min-h-[96px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 font-mono text-xs font-semibold text-foreground group-hover:border-primary/40 transition-colors">
                            {subject.code}
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>

                        <div className="pt-3">
                          <h2 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-1">
                            {subject.name}
                          </h2>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar - self-start h-fit ensures it aligns with short subject cards and never stretches into empty void */}
          <Card className="flex flex-col border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden self-start h-fit">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Calendar
              </CardTitle>

              {/* Jump to Today button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDate(today);
                  setCalendarMonth(today);
                }}
                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Jump to today"
              >
                <CalendarDays className="size-3.5" />
                Today
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-4">
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={selectedDate}
                onSelect={setSelectedDate}
                showOutsideDays
                captionLayout="dropdown"
                startMonth={new Date(2020, 0)}
                endMonth={new Date(2035, 11)}
                className="w-full p-0"
              />
            </CardContent>
          </Card>
        </div>

        {/* Hot Community Discussions */}
        <Card className="border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
            <CardTitle className="text-base font-semibold text-foreground">
              Hot Discussions
            </CardTitle>

            <Link
              to="/communities"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="p-2 sm:p-3">
            {loadingPosts ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading hot discussions...
              </div>
            ) : hotPosts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No trending discussions right now.
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {hotPosts.map((post) => {
                  const subject = enrolledSubjects.find(
                    (s) => s.id === post.subjectId
                  );
                  const netScore = post.upvotes - post.downvotes;

                  return (
                    <Link
                      key={post.id}
                      to={`/communities/${post.subjectId}/post/${post.id}`}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-3 px-3 rounded-lg transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-medium bg-muted/80 text-muted-foreground border border-border/50">
                          {subject?.code || post.subjectId.toUpperCase()}
                        </span>

                        <h3 className="line-clamp-1 text-sm text-foreground transition-colors group-hover:text-primary font-normal">
                          {post.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground pl-11 sm:pl-0">
                        {/* Vote count capsule */}
                        <div
                          className="inline-flex h-7 items-center rounded-lg border border-border/80 bg-secondary/40 px-1 text-xs text-muted-foreground"
                          title="Open post to vote"
                        >
                          <span className="flex h-5 w-5 items-center justify-center rounded transition-colors group-hover:text-foreground">
                            <ArrowBigUp className="size-3.5" />
                          </span>
                          <span className="min-w-[1.25rem] px-0.5 text-center font-medium text-foreground text-xs">
                            {netScore}
                          </span>
                          <span className="flex h-5 w-5 items-center justify-center rounded transition-colors group-hover:text-foreground">
                            <ArrowBigDown className="size-3.5" />
                          </span>
                        </div>

                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="size-3.5 text-muted-foreground/80" />
                          {post.replyCount || 0} {post.replyCount === 1 ? "reply" : "replies"}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
