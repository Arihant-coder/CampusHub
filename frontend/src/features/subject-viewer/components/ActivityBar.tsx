/**
 * @file ActivityBar.tsx
 * @description VS Code-style slim vertical activity rail for Subject Workspace.
 *              Hosts navigation icon toggles for the Course Resources drawer and quick actions.
 * @owner Subject Viewer Team
 */

import React from "react";
import { FolderOpen, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  isResourcesOpen: boolean;
  onToggleResources: () => void;
  onCreateNote: () => void;
}

export function ActivityBar({
  isResourcesOpen,
  onToggleResources,
  onCreateNote,
}: Props) {
  return (
    <nav
      aria-label="Activity Bar"
      className="w-11 shrink-0 flex flex-col items-center py-2 gap-1.5 border-r border-border bg-card select-none z-20 shadow-xs"
    >
      {/* Course Resources Drawer Toggle */}
      <div className="relative flex items-center justify-center">
        {isResourcesOpen && (
          <span
            aria-hidden="true"
            className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary"
          />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleResources}
          className={`h-8 w-8 rounded-md transition-colors cursor-pointer ${
            isResourcesOpen
              ? "bg-background text-foreground shadow-xs font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
          }`}
          title={isResourcesOpen ? "Hide Course Resources" : "Show Course Resources"}
          aria-label={isResourcesOpen ? "Hide Course Resources" : "Show Course Resources"}
          aria-pressed={isResourcesOpen}
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
      </div>

      {/* Quick Action: New Private Note */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCreateNote}
        className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        title="Create New Note"
        aria-label="Create New Note"
      >
        <FilePlus2 className="h-4 w-4" />
      </Button>
    </nav>
  );
}
