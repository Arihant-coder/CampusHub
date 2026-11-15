import React, { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  Users,
  Wrench,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Brain,
  Sun,
  Moon,
  Laptop,
  Check,
  LogOut,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSubjectById } from "@/shared/subjects";
import { HeaderProvider, useHeader } from "@/lib/header-context";
import { UserSubjectsProvider, useUserSubjects } from "@/lib/user-subjects-context";
import { useResizable } from "@/lib/use-resizable";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { useAuth } from "@/lib/auth-context";
import { AvatarUploadDialog } from "@/features/auth/components/AvatarUploadDialog";
import { PrivacyOnboardingModal } from "@/features/auth/components/PrivacyOnboardingModal";
import { SubjectEnrollmentDialog } from "@/components/subjects/SubjectEnrollmentDialog";

function getInitials(name?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "ST";
}

const studentTools = [
  {
    to: "/daily-quiz",
    label: "Daily Quiz",
    icon: Brain,
  },
];

function getPageTitle(pathname: string): string {
  if (pathname === "/" || pathname === "/dashboard") return "Dashboard";

  if (pathname.startsWith("/communities")) {
    return "Communities";
  }

  if (pathname.startsWith("/daily-quiz")) {
    return "Daily Quiz";
  }

  if (pathname.startsWith("/subjects")) {
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length > 1) {
      const subject = getSubjectById(parts[1]);

      if (subject) {
        return subject.name;
      }
    }

    return "My Subjects";
  }

  return "Dashboard";
}

function RootLayoutContent() {
  const [isSidebarOpen, setIsSidebarOpen] = usePersistentToggle("campushub:sidebar:main", false);
  const [isStudentToolsOpen, setIsStudentToolsOpen] = usePersistentToggle("campushub:sidebar:student-tools", true);
  const [isSubjectsOpen, setIsSubjectsOpen] = usePersistentToggle("campushub:sidebar:subjects", true);
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enrolledSubjects, openModal: openSubjectModal } = useUserSubjects();
  const displayEmail =
    user?.email ||
    (user?.handle === "morgan_t"
      ? "moderator@campushub.edu"
      : user?.handle === "sarah_vance"
      ? "admin@campushub.edu"
      : user?.handle === "alex_chen"
      ? "student@campushub.edu"
      : undefined);
  const { actions, title: customTitle, center, tabs, sidebarOffset, isSidebarOffsetDragging } = useHeader();

  const { setTheme, theme, resolvedTheme } = useTheme();

  const {
    width: sidebarWidth,
    isDragging: isSidebarDragging,
    handleProps: sidebarHandleProps,
  } = useResizable({
    direction: "right",
    defaultWidth: 256,
    minWidth: 200,
    maxWidth: 440,
    storageKey: "campushub:left-sidebar-width",
  });

  const pageTitle = customTitle || getPageTitle(location.pathname);
  const isSubjectWorkspace = location.pathname.startsWith("/subjects");

  const isStudentToolsActive = studentTools.some((tool) => location.pathname.startsWith(tool.to));
  const isSubjectsActive = location.pathname.startsWith("/subjects");

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div
      className={`flex bg-background text-foreground ${
        isSubjectWorkspace ? "h-dvh overflow-hidden" : "min-h-screen"
      }`}
    >
      {/* Sidebar with toggle */}
      <aside
        style={{
          width: isSidebarOpen ? `${sidebarWidth}px` : 0,
        }}
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-card max-w-[calc(100vw-3rem)] md:max-w-none md:relative md:inset-auto md:z-auto shrink-0 overflow-hidden ${
          isSidebarDragging ? "" : "transition-[width] duration-200 ease-in-out"
        } ${
          isSidebarOpen
            ? "translate-x-0 overflow-visible border-r"
            : "-translate-x-full md:translate-x-0 overflow-hidden border-r-0 pointer-events-none"
        }`}
      >
        <div
          style={{ width: `${sidebarWidth}px` }}
          className={`flex h-full w-full max-w-full flex-col justify-between p-4 overflow-y-auto transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-6">
            {/* CampusHub Logo & Mobile Sidebar Close Button */}
            <div className="flex items-center justify-between">
              <Link
                to="/"
                onClick={closeSidebarOnMobile}
                className="flex items-center gap-2.5 px-2 py-1.5 text-xl font-bold tracking-tight text-foreground"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>

                <span>CampusHub</span>
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(false)}
                aria-label="Hide sidebar"
                className="h-9 w-9 text-muted-foreground hover:text-foreground md:hidden shrink-0"
              >
                <PanelLeftClose className="h-5 w-5" />
              </Button>
            </div>

            {/* Main Navigation */}
            <nav className="space-y-1.5">
              {/* Dashboard */}
              <NavLink
                to="/"
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              {/* Communities */}
              <NavLink
                to="/communities"
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>Communities</span>
              </NavLink>

              {/* Admin Panel (Admin Only) */}
              {user?.role === "admin" && (
                <NavLink
                  to="/admin/moderators"
                  onClick={closeSidebarOnMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`
                  }
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-destructive" />
                  <span>Moderator Admin</span>
                </NavLink>
              )}

              {/* Student Tools */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setIsStudentToolsOpen((previous) => !previous)
                  }
                  className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isStudentToolsActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  aria-expanded={isStudentToolsOpen}
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="h-4 w-4 shrink-0" />
                    <span>Student Tools</span>
                  </div>

                  {isStudentToolsOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {isStudentToolsOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                    {studentTools.map((tool) => {
                      const Icon = tool.icon;
                      const isActive = location.pathname.startsWith(tool.to);

                      return (
                        <NavLink
                          key={tool.to}
                          to={tool.to}
                          onClick={closeSidebarOnMobile}
                          className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 font-semibold text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{tool.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Subjects */}
              <div className="pt-1">
                <div className="flex items-center justify-between group/subjects pr-1">
                  <button
                    type="button"
                    onClick={() => setIsSubjectsOpen((previous) => !previous)}
                    className={`flex flex-1 cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isSubjectsActive
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    aria-expanded={isSubjectsOpen}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 shrink-0" />
                      <span>My Subjects</span>
                    </div>

                    {isSubjectsOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSubjectModal();
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    title="Manage enrolled subjects"
                    aria-label="Manage enrolled subjects"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {isSubjectsOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                    {enrolledSubjects.length === 0 ? (
                      <div className="py-2 px-2 text-xs text-muted-foreground space-y-1.5">
                        <p>No subjects enrolled</p>
                        <button
                          type="button"
                          onClick={openSubjectModal}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add subjects
                        </button>
                      </div>
                    ) : (
                      <>
                        {enrolledSubjects.map((subject) => {
                          const isActive =
                            location.pathname === `/subjects/${subject.id}`;

                          return (
                            <NavLink
                              key={subject.id}
                              to={`/subjects/${subject.id}`}
                              onClick={closeSidebarOnMobile}
                              className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                                isActive
                                  ? "bg-primary/10 font-semibold text-primary"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <span className="truncate pr-1.5">
                                {subject.name}
                              </span>

                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                {subject.code}
                              </span>
                            </NavLink>
                          );
                        })}

                        <div className="pt-1 px-1">
                          <button
                            type="button"
                            onClick={openSubjectModal}
                            className="flex w-full items-center gap-1.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Manage subjects</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* Sidebar Resize Handle */}
        {isSidebarOpen && (
          <ResizeHandle
            side="right"
            isDragging={isSidebarDragging}
            {...sidebarHandleProps}
            className="hidden md:flex"
          />
        )}
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-background/80 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className={`flex h-14 items-center justify-between border-b bg-background min-w-0 ${
            isSubjectWorkspace
              ? "px-0 gap-0"
              : "px-2 sm:px-4 lg:px-6 gap-2 sm:gap-4"
          }`}
        >
          <div className="flex items-center h-full min-w-0 flex-1">
            <div
              style={
                sidebarOffset > 0
                  ? { width: `${sidebarOffset}px` }
                  : undefined
              }
              className={`flex items-center h-full px-2 sm:px-3 gap-2 shrink-0 ${
                isSidebarOffsetDragging ? "transition-none" : "transition-[width] duration-200 ease-in-out"
              } overflow-hidden ${
                sidebarOffset > 0 ? "border-r border-border" : ""
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen((previous) => !previous)}
                aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
                className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
              >
                {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
              </Button>

              <h1
                className={`font-semibold text-foreground truncate shrink-0 leading-none ${
                  tabs
                    ? "text-xs sm:text-sm max-w-[140px] sm:max-w-[180px] lg:max-w-[240px]"
                    : "text-base md:text-lg"
                }`}
              >
                {pageTitle}
              </h1>
            </div>

            {tabs && (
              <div
                className={`flex items-center h-full min-w-0 flex-1 overflow-x-auto no-scrollbar scroll-smooth ${
                  sidebarOffset > 0 ? "px-3" : "pl-1 pr-3"
                }`}
                onWheel={(e) => {
                  if (e.deltaY !== 0) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                {sidebarOffset === 0 && (
                  <div className="h-5 w-px bg-border/70 shrink-0 mr-2 sm:mr-3" />
                )}
                {tabs}
              </div>
            )}
          </div>

          {/* Centered In-Flow Header Slot with min-w-0 so it NEVER overlaps! */}
          {!tabs && center ? (
            <div className="flex-1 flex items-center justify-center min-w-0 px-2 sm:px-4">
              <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl min-w-0">
                {center}
              </div>
            </div>
          ) : !tabs ? (
            <div className="flex-1" />
          ) : null}

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Feature Custom Header Actions */}
            {actions}

            {/* Theme Selector (Light, Dark, System) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Select theme"
                  title={`Theme: ${theme || "system"}`}
                  className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                >
                  {resolvedTheme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem
                  onClick={() => setTheme("light")}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Sun className="h-4 w-4" />
                  <span>Light</span>
                  {theme === "light" && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("dark")}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Moon className="h-4 w-4" />
                  <span>Dark</span>
                  {theme === "dark" && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setTheme("system")}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  <Laptop className="h-4 w-4" />
                  <span>System</span>
                  {(theme === "system" || !theme) && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2.5 rounded-full sm:rounded-xl sm:px-2.5 sm:py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-muted/70 text-left shrink-0"
                  aria-label="User profile menu"
                >
                  <Avatar className="h-8 w-8 border border-border shrink-0">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName || "User"} />}
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col min-w-0 pr-1">
                    <span className="text-xs font-semibold text-foreground truncate leading-tight">
                      {user?.fullName || "Student User"}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate font-mono leading-tight">
                      {user?.role === "admin"
                        ? "Admin Staff"
                        : (user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0)
                        ? "Moderator"
                        : "Student ID • CS-2024"}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[330px] p-3 shadow-2xl border-border/80 rounded-2xl bg-card">
                <DropdownMenuLabel className="p-0 font-normal">
                  {/* User Profile Info Header */}
                  <div className="flex items-start gap-3.5 pb-2">
                    <Avatar className="h-12 w-12 border border-border/80 shrink-0 shadow-xs">
                      {user?.avatarUrl && (
                        <AvatarImage src={user.avatarUrl} alt={user.fullName || "User"} />
                      )}
                      <AvatarFallback className="text-base font-semibold bg-primary/10 text-primary">
                        {getInitials(user?.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-base font-bold text-foreground truncate tracking-tight">
                          {user?.fullName || "Student User"}
                        </h2>
                        {user?.role === "admin" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-red-200/80 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-400 shrink-0">
                            <ShieldAlert className="size-3.5" />
                            Admin
                          </span>
                        ) : user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-400 shrink-0">
                            <ShieldCheck className="size-3.5" />
                            Moderator
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shrink-0">
                            <GraduationCap className="size-3.5" />
                            Student
                          </span>
                        )}
                      </div>

                      {displayEmail && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/80 truncate pt-0.5">
                          <Mail className="size-3.5 shrink-0 text-muted-foreground/80" />
                          <span className="truncate">{displayEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Moderator Scope Row */}
                  {user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1.5 pb-1 gap-2">
                      <span className="text-muted-foreground font-medium shrink-0">
                        Moderator Scope
                      </span>
                      <div className="flex flex-wrap items-center gap-1 justify-end">
                        {Array.from(new Set(user.moderatedSubjectIds)).map((id) => {
                          const sub = getSubjectById(id);
                          return (
                            <span
                              key={id}
                              className="font-mono text-[11px] px-2 py-0.5 rounded-md font-medium bg-muted/70 text-foreground border border-border/60"
                            >
                              {sub?.code || id.toUpperCase()}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-2" />

                {/* Navigation and Action Items */}
                <div className="space-y-0.5">
                  {user?.role === "admin" && (
                    <DropdownMenuItem
                      className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted/60 focus:bg-muted/60 transition-colors"
                      onClick={() => navigate("/admin/moderators")}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground leading-tight">
                            Moderator Admin
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            Manage community moderators
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )}

                  {(user?.role === "admin" ||
                    (user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0)) && (
                    <DropdownMenuItem
                      className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted/60 focus:bg-muted/60 transition-colors"
                      onClick={() => navigate("/communities/moderation")}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <ShieldCheck className="size-4 text-foreground/80 shrink-0 mt-0.5" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground leading-tight">
                            Resource Moderation
                          </span>
                          <span className="text-xs text-muted-foreground mt-0.5">
                            Review pending submissions & reports
                          </span>
                        </div>
                      </div>
                      <span className="size-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted/60 focus:bg-muted/60 transition-colors"
                    onClick={() => {
                      if (user?.handle) navigate(`/u/${user.handle}`);
                    }}
                  >
                    <User className="size-4 text-foreground/80 shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      View Public Profile
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted/60 focus:bg-muted/60 transition-colors"
                    onClick={() => setIsAvatarDialogOpen(true)}
                  >
                    <Camera className="size-4 text-foreground/80 shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      Change Profile Picture
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted/60 focus:bg-muted/60 transition-colors"
                    onClick={() => setIsAvatarDialogOpen(true)}
                  >
                    <User className="size-4 text-foreground/80 shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      Account Settings
                    </span>
                  </DropdownMenuItem>
                </div>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  className="flex items-center gap-3 px-3 py-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg font-medium transition-colors"
                  onClick={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut className="size-4 shrink-0" />
                  <span className="text-sm">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content Area */}
        <main
          className={
            isSubjectWorkspace
              ? "flex-1 min-h-0 overflow-hidden"
              : "flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          }
        >
          <Outlet />
        </main>

        {/* Profile Picture Upload Dialog */}
        <AvatarUploadDialog
          open={isAvatarDialogOpen}
          onOpenChange={setIsAvatarDialogOpen}
        />

        {/* First-Time Privacy Onboarding Modal */}
        <PrivacyOnboardingModal />

        {/* Global Subject Enrollment / Management Dialog */}
        <SubjectEnrollmentDialog />
      </div>
    </div>
  );
}

export default function RootLayout() {
  return (
    <HeaderProvider>
      <UserSubjectsProvider>
        <RootLayoutContent />
      </UserSubjectsProvider>
    </HeaderProvider>
  );
}
