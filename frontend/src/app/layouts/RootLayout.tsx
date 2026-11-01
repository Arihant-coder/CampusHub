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
  GitBranch,
  FileText,
  Brain,
  Sun,
  Moon,
  LogOut,
  Camera,
  ShieldCheck,
  ShieldAlert,
  Mail,
  User,
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
import { subjects } from "@/shared/subjects";
import { HeaderProvider, useHeader } from "@/lib/header-context";
import { ImageViewerProvider } from "@/lib/image-viewer-context";
import { useResizable } from "@/lib/use-resizable";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { useAuth } from "@/lib/auth-context";
import { AvatarUploadDialog } from "@/features/auth/components/AvatarUploadDialog";

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
    to: "/project-analysis",
    label: "Project Analysis",
    icon: GitBranch,
  },
  {
    to: "/resume-reviewer",
    label: "Resume Reviewer",
    icon: FileText,
  },
  {
    to: "/daily-quiz",
    label: "Daily Quiz",
    icon: Brain,
  },
];

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";

  if (pathname.startsWith("/communities")) {
    return "Communities";
  }

  if (pathname.startsWith("/project-analysis")) {
    return "Project Analysis";
  }

  if (pathname.startsWith("/resume-reviewer")) {
    return "Resume Reviewer";
  }

  if (pathname.startsWith("/daily-quiz")) {
    return "Daily Quiz";
  }

  if (pathname.startsWith("/subjects")) {
    const parts = pathname.split("/").filter(Boolean);

    if (parts.length > 1) {
      const subject = subjects.find((s) => s.id === parts[1]);

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
  const displayEmail =
    user?.email ||
    (user?.handle === "morgan_t"
      ? "moderator@campushub.edu"
      : user?.handle === "sarah_vance"
      ? "admin@campushub.edu"
      : user?.handle === "alex_chen"
      ? "student@campushub.edu"
      : undefined);
  const { actions, title: customTitle, center } = useHeader();

  const { setTheme, resolvedTheme } = useTheme();

  const isDarkMode = resolvedTheme === "dark";

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
  const isSubjectWorkspace = /^\/subjects\/[^/]+/.test(location.pathname);

  const isStudentToolsActive = studentTools.some((tool) => location.pathname.startsWith(tool.to));
  const isSubjectsActive = location.pathname.startsWith("/subjects");

  const closeSidebarOnMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(isDarkMode ? "light" : "dark");
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
        className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-card md:static relative shrink-0 overflow-hidden ${
          isSidebarDragging ? "" : "transition-[width] duration-200 ease-in-out"
        } ${
          isSidebarOpen
            ? "translate-x-0 overflow-visible border-r"
            : "-translate-x-full md:translate-x-0 overflow-hidden border-r-0 pointer-events-none"
        }`}
      >
        <div
          style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
          className={`flex h-full flex-col justify-between p-4 overflow-y-auto transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="space-y-6">
            {/* CampusHub Logo */}
            <Link
              to="/"
              onClick={closeSidebarOnMobile}
              className="flex items-center gap-2.5 px-2 py-1.5 text-xl font-bold tracking-tight"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>

              <span>CampusHub</span>
            </Link>

            {/* Main Navigation */}
            <nav className="space-y-1.5">
              {/* Dashboard */}
              <NavLink
                to="/"
                onClick={closeSidebarOnMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary font-semibold text-foreground"
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
                  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary font-semibold text-foreground"
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
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-secondary font-semibold text-foreground"
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
                  className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
                              ? "bg-secondary font-medium text-foreground"
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
                <button
                  type="button"
                  onClick={() => setIsSubjectsOpen((previous) => !previous)}
                  className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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

                {isSubjectsOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                    {subjects.map((subject) => {
                      const isActive =
                        location.pathname === `/subjects/${subject.id}`;

                      return (
                        <NavLink
                          key={subject.id}
                          to={`/subjects/${subject.id}`}
                          onClick={closeSidebarOnMobile}
                          className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                            isActive
                              ? "bg-secondary font-medium text-foreground"
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
        <header className="relative flex h-14 items-center justify-between border-b pl-2 pr-4 lg:pr-6 bg-background">
          <div className="flex items-center gap-2 shrink-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen((previous) => !previous)}
              aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
            >
              {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>

            <h1 className="text-base font-semibold text-foreground md:text-lg truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
              {pageTitle}
            </h1>
          </div>

          {/* Centered Header Slot */}
          {center && (
            <div className="absolute inset-x-0 mx-auto flex items-center justify-center pointer-events-none px-4">
              <div className="pointer-events-auto w-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl flex justify-center">
                {center}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0 z-10">
            {/* Feature Custom Header Actions */}
            {actions}

            {/* Theme Toggle */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="rounded-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:ring-2 hover:ring-primary/10"
                  aria-label="User profile menu"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName || "User"} />}
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  </Avatar>
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
                          const sub = subjects.find((s) => s.id.toLowerCase() === id.toLowerCase());
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
      </div>
    </div>
  );
}

export default function RootLayout() {
  return (
    <HeaderProvider>
      <ImageViewerProvider>
        <RootLayoutContent />
      </ImageViewerProvider>
    </HeaderProvider>
  );
}
