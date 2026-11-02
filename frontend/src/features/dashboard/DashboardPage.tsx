import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowBigDown,
  ArrowBigUp,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock,
  Flame,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import type { Subject } from "@/shared/user";
import type { Post } from "@/shared/communities";
import { dashboardService } from "./services";
import {
  calendarEventsService,
  formatDateKey,
  type CalendarEvent,
  type CalendarEventType,
  type UserActivityStreak,
} from "./services/calendarEventsService";

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

const eventBadgeStyles: Record<CalendarEventType, { label: string; badge: string }> = {
  test: {
    label: "Class Test",
    badge: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
  },
  assignment: {
    label: "Assignment",
    badge: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
  },
  exam: {
    label: "Exam",
    badge: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300",
  },
  reminder: {
    label: "Reminder",
    badge: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  event: {
    label: "Event",
    badge: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
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
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [streakData, setStreakData] = useState<UserActivityStreak>({
    currentStreak: 5,
    bestStreak: 8,
    activeDates: [],
  });

  // Add Event Dialog State
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventType, setNewEventType] = useState<CalendarEventType>("test");
  const [newEventDate, setNewEventDate] = useState(formatDateKey(today));
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");

  // Subjects & Hot discussions state
  const [enrolledSubjects, setEnrolledSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Initialize Calendar Data & Streaks
  useEffect(() => {
    setEvents(calendarEventsService.getEvents());
    setStreakData(calendarEventsService.getActivityStreak());
  }, []);

  // Synchronize newEventDate when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setNewEventDate(formatDateKey(selectedDate));
    }
  }, [selectedDate]);

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

  // Modifiers for fast day-picker lookup
  const streakDateSet = useMemo(
    () => new Set(streakData.activeDates),
    [streakData.activeDates]
  );

  const eventDateSet = useMemo(
    () => new Set(events.map((e) => e.date)),
    [events]
  );

  const testDateSet = useMemo(
    () =>
      new Set(
        events
          .filter((e) => e.type === "test" || e.type === "exam")
          .map((e) => e.date)
      ),
    [events]
  );

  const selectedDateKey = selectedDate
    ? formatDateKey(selectedDate)
    : formatDateKey(today);

  const selectedDayEvents = useMemo(
    () => events.filter((e) => e.date === selectedDateKey),
    [events, selectedDateKey]
  );

  const selectedDateFormatted = useMemo(() => {
    if (!selectedDate) return "Today";
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  // Handle Event Creation
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) {
      toast.error("Please enter a title for the event or test.");
      return;
    }

    const created = calendarEventsService.addEvent({
      title: newEventTitle.trim(),
      date: newEventDate,
      type: newEventType,
      time: newEventTime.trim() || undefined,
      description: newEventDesc.trim() || undefined,
    });

    setEvents((prev) => [created, ...prev]);
    setIsAddEventOpen(false);
    setNewEventTitle("");
    setNewEventTime("");
    setNewEventDesc("");
    toast.success("Event added to calendar!");
  };

  // Handle Event Deletion
  const handleDeleteEvent = (id: string) => {
    calendarEventsService.deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    toast.success("Event removed from calendar.");
  };

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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_390px]">
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

          {/* Enhanced Calendar Card */}
          <Card className="flex flex-col border-border/70 bg-card shadow-xs rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3.5 gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  Calendar
                </CardTitle>
                {/* Active Usage Streak Badge */}
                <Badge
                  variant="outline"
                  className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5 text-xs shadow-2xs"
                  title={`${streakData.currentStreak} consecutive days using CampusHub!`}
                >
                  <Flame className="size-3.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                  <span>{streakData.currentStreak}d Streak</span>
                </Badge>
              </div>

              {/* Jump to Today button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDate(today);
                  setCalendarMonth(today);
                }}
                className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                title="Jump to today"
              >
                <CalendarDays className="size-3.5" />
                Today
              </Button>
            </CardHeader>

            <CardContent className="p-3 sm:p-4 space-y-3.5">
              {/* Interactive Calendar with Month/Year Dropdown Pickers */}
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                  }
                }}
                showOutsideDays
                captionLayout="dropdown"
                startMonth={new Date(2020, 0)}
                endMonth={new Date(2035, 11)}
                modifiers={{
                  streak: (d) => streakDateSet.has(formatDateKey(d)),
                  hasEvent: (d) => eventDateSet.has(formatDateKey(d)),
                  isTest: (d) => testDateSet.has(formatDateKey(d)),
                }}
                className="w-full p-0"
              />

              {/* Calendar Visual Legend */}
              <div className="flex items-center justify-between border-t border-border/60 pt-2.5 px-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5" title="Class Tests or Exams">
                  <span className="size-2 rounded-full bg-rose-500 ring-1 ring-rose-400" />
                  <span>Class Test</span>
                </div>
                <div className="flex items-center gap-1.5" title="Assignments or Events">
                  <span className="size-2 rounded-full bg-amber-500 ring-1 ring-amber-400" />
                  <span>Assignment / Note</span>
                </div>
                <div className="flex items-center gap-1.5" title="Consecutive days on CampusHub">
                  <span className="size-2 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-500/60" />
                  <span>Active Streak</span>
                </div>
              </div>

              {/* Selected Day Agenda & Test Manager */}
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      {selectedDateFormatted}
                    </span>
                    {selectedDayEvents.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                        {selectedDayEvents.length}
                      </span>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddEventOpen(true)}
                    className="h-6 px-2 text-[11px] font-medium gap-1 text-primary hover:text-primary hover:bg-primary/10 border-primary/30"
                  >
                    <Plus className="size-3" />
                    Add Event
                  </Button>
                </div>

                {/* Events list for selected date */}
                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-1">
                    No tests or reminders for this date.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {selectedDayEvents.map((evt) => {
                      const typeConfig =
                        eventBadgeStyles[evt.type] || eventBadgeStyles.reminder;

                      return (
                        <div
                          key={evt.id}
                          className="flex items-start justify-between gap-2 rounded-lg border border-border/80 bg-card p-2 shadow-2xs group"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold border ${typeConfig.badge}`}
                              >
                                {typeConfig.label}
                              </span>
                              {evt.time && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="size-3" />
                                  {evt.time}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-foreground leading-tight">
                              {evt.title}
                            </p>
                            {evt.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2">
                                {evt.description}
                              </p>
                            )}
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteEvent(evt.id)}
                            className="size-6 text-muted-foreground hover:text-destructive opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
                            title="Delete reminder"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
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

      {/* Add Event / Class Test Modal Dialog */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateEvent}>
            <DialogHeader>
              <DialogTitle>Add Important Date / Test</DialogTitle>
              <DialogDescription>
                Schedule a class test, assignment deadline, or reminder on your calendar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Event Title */}
              <div className="space-y-1.5">
                <Label htmlFor="event-title">Title / Name *</Label>
                <Input
                  id="event-title"
                  placeholder="e.g. Class Test - Database Systems"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Type & Date Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="event-type">Category</Label>
                  <select
                    id="event-type"
                    value={newEventType}
                    onChange={(e) =>
                      setNewEventType(e.target.value as CalendarEventType)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="test">Class Test</option>
                    <option value="assignment">Assignment Due</option>
                    <option value="exam">Mid-term / Exam</option>
                    <option value="reminder">Reminder</option>
                    <option value="event">Campus Event</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label htmlFor="event-time">Time (Optional)</Label>
                <Input
                  id="event-time"
                  placeholder="e.g. 10:30 AM"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="event-desc">Notes / Topics (Optional)</Label>
                <Textarea
                  id="event-desc"
                  placeholder="e.g. Chapters 1 to 4: ER Diagrams and Normalization"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddEventOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Event</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
