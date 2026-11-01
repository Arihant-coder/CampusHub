/**
 * @file SubjectForumsSidebar.tsx
 * @description Secondary sidebar for navigating enrolled and pinned subject forums with transform slide toggling.
 * @owner Communities Team
 */

import React from "react";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SubjectForum } from "../services/types";

interface SubjectForumsSidebarProps {
  forums: SubjectForum[];
  activeSubjectId: string;
  onSelectSubject: (subjectId: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function SubjectForumsSidebar({
  forums,
  activeSubjectId,
  onSelectSubject,
  isOpen,
  onToggleOpen,
}: SubjectForumsSidebarProps) {
  const enrolledForums = forums.filter((f) => !f.isPinned);
  const pinnedForums = forums.filter((f) => f.isPinned);

  return (
    <>
      <aside
        className={`h-full shrink-0 relative flex flex-col bg-card/30 border-r select-none transition-[width] duration-200 ease-in-out ${
          isOpen ? "w-64 border-r" : "w-0 border-r-0 pointer-events-none"
        }`}
      >
        {/* Inner container stays fixed width w-64 so items NEVER re-size or squish */}
        <div
          className={`w-64 h-full p-3 flex flex-col overflow-y-auto transition-transform duration-200 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header with collapse button */}
          <div className="flex items-center justify-between px-2 py-1 mb-2 shrink-0">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              My Subject Forums
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleOpen}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Collapse forums"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Enrolled Subjects List */}
          <div className="space-y-1 overflow-y-auto flex-1">
            {enrolledForums.map((forum) => {
              const isActive = forum.id === activeSubjectId;
              return (
                <button
                  key={forum.id}
                  type="button"
                  onClick={() => onSelectSubject(forum.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-primary/10 border border-primary/25 text-primary font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={isActive ? "text-primary" : "text-muted-foreground"}>•</span>
                    <span className="truncate">{forum.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Pinned Forums Section */}
          {pinnedForums.length > 0 && (
            <div className="mt-4 pt-3 border-t shrink-0">
              <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <Pin className="h-3 w-3" />
                <span>Pinned Forums</span>
              </div>
              <div className="space-y-1">
                {pinnedForums.map((forum) => {
                  const isActive = forum.id === activeSubjectId;
                  return (
                    <button
                      key={forum.id}
                      type="button"
                      onClick={() => onSelectSubject(forum.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-primary/10 border border-primary/25 text-primary font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={isActive ? "text-primary" : "text-muted-foreground"}>•</span>
                        <span className="truncate">{forum.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* When sidebar is collapsed, sleek edge toggle button to open it */}
      {!isOpen && (
        <div className="absolute left-0 top-3 z-20">
          <Button
            variant="outline"
            size="icon"
            onClick={onToggleOpen}
            className="h-7 w-7 rounded-r-md rounded-l-none border-l-0 shadow-xs bg-card hover:bg-secondary text-muted-foreground hover:text-foreground"
            title="Open subject forums"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
