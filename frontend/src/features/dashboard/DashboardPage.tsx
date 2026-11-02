import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowRight,
  BookOpen,
  CalendarDays,
  MessageSquare,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { getAppStreak, formatStreakDate } from "@/lib/streak";
import type { Subject } from "@/shared/user";
import type { Post } from "@/shared/communities";
import { dashboardService } from "./services";

const subjectStatusMap: Record<string, string> = {
  cs301: "2 upcoming tasks",
  cs302: "Lab on Thursday",
  cs303: "Midterm in 5 days",
  cs304: "All tasks submitted",
};

const subjectBadgeTheme: Record<string, string> = {
  cs301: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  cs302: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300",
  cs303: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300",
  cs304: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

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
  const today = useMemo(() => new Date(), []);

  // Calendar State
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(today);
  const [calendarMonth, setCalendarMonth] = useState<Date>(today);

  // Activity Streak Data
  const streakData = useMemo(() => getAppStreak(), []);
  const streakDateSet = useMemo(
    () => new Set(streakData.activeDates),
    [streakData.activeDates]
  );

  // Subjects & Hot discussions state
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Load Dashboard Data
  useEffect(() => {
    let isMounted = true;

    async function loadDashboardData() {
      try {
        setLoadingSubjects(true);
        setLoadingPosts(true);

        const [subjectsRes, postsRes] = await Promise.all([
          dashboardService.getEnrolledSubjects(),
          dashboardService.getHotDiscussions(5),
        ]);

        if (isMounted) {
          if (subjectsRes.data) {
            setEnrolledSubjects(subjectsRes.data);
          }
          if (postsRes.data) {
            setHotPosts(postsRes.data);
          }
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (isMounted) {
          setLoadingSubjects(false);
          setLoadingPosts(false);
        }
      }
    }

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-full w-full min-w-0 bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Simple Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back{user?.fullName ? `, ${user.fullName}` : ""}.
          </p>
        </div>

        {/* Subjects & Calendar Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
          {/* My Subjects */}
          <Card className="flex flex-col border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-4">
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
            </CardHeader>

            <CardContent className="flex-1 p-4 sm:p-5">
              {loadingSubjects ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading enrolled subjects...
                </div>
              ) : enrolledSubjects.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No enrolled subjects found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {enrolledSubjects.map((subject) => {
                    const badgeClass =
                      subjectBadgeTheme[subject.id.toLowerCase()] ||
                      "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300";
                    const statusText =
                      subjectStatusMap[subject.id.toLowerCase()] ||
                      "Active enrollment";

                    return (
                      <Link
                        key={subject.id}
                        to={`/subjects/${subject.id}`}
                        className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs min-h-[110px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tracking-wide ${badgeClass}`}
                          >
                            {subject.code}
                          </span>
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                        </div>

                        <div className="space-y-1 pt-3">
                          <h2 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary line-clamp-1">
                            {subject.name}
                          </h2>
                          <p className="text-xs text-muted-foreground">
                            {statusText}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clean Calendar Card with Month & Year Selection */}
          <Card className="flex flex-col border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
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

            <CardContent className="p-3 sm:p-4 space-y-3">
              {/* Interactive Calendar with Month/Year Selection */}
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
                modifiers={{
                  streak: (d) => streakDateSet.has(formatStreakDate(d)),
                }}
                className="w-full p-0"
              />

              {/* Minimal Legend */}
              <div className="flex items-center justify-center border-t border-border/60 pt-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5" title="Consecutive active days on CampusHub">
                  <span className="size-2 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-500/60" />
                  <span>Green days: Active streak</span>
                </div>
              </div>
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
                          {post.replyCount || 0}{" "}
                          {post.replyCount === 1 ? "reply" : "replies"}
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
