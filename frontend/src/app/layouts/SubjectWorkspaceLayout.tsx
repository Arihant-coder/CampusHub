/**
 * @file SubjectWorkspaceLayout.tsx
 * @description Composite layout combining Subject Viewer (main canvas) and collapsible AI Panel (right sidebar).
 * @owner App Shell Team
 */

import React from "react";
import { Outlet, useParams } from "react-router-dom";
import { PanelRight, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/lib/header-context";
import { useResizable } from "@/lib/use-resizable";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { ResizeHandle } from "@/components/ui/resize-handle";
import SubjectAiPanelPage from "@/features/subject-ai-panel/SubjectAiPanelPage";
import { getSubjectById } from "@/shared/subjects";

export default function SubjectWorkspaceLayout() {
  const [isOpen, setIsOpen] = usePersistentToggle("campushub:sidebar:ai-panel", true);
  const { subjectId } = useParams<{ subjectId: string }>();
  const subjectName = getSubjectById(subjectId)?.name;
  const {
    width: aiPanelWidth,
    isDragging: isAiDragging,
    handleProps: aiHandleProps,
  } = useResizable({
    direction: "left",
    defaultWidth: 384,
    minWidth: 280,
    maxWidth: 640,
    storageKey: "campushub:right-ai-sidebar-width",
  });

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Inject AI Panel toggle into the top main header */}
      <HeaderActions>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen((prev) => !prev)}
          className={
            isOpen
              ? "text-foreground bg-secondary hover:bg-secondary/80"
              : "text-muted-foreground hover:text-foreground"
          }
          aria-label={isOpen ? "Collapse AI Panel" : "Expand AI Panel"}
          title={isOpen ? "Collapse AI Panel" : "Expand AI Panel"}
        >
          {isOpen ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRight className="h-5 w-5" />
          )}
        </Button>
      </HeaderActions>

      {/* Main Canvas: Left notes tree + Center document/PDF viewer */}
      <div className="flex-1 overflow-auto min-w-0">
        <Outlet />
      </div>

      {/* Right Sidebar: AI Companion Study Panel */}
      <aside
        style={{
          width: isOpen ? `${aiPanelWidth}px` : 0,
        }}
        className={`bg-card shrink-0 relative flex flex-col overflow-hidden ${
          isAiDragging ? "" : "transition-[width] duration-200 ease-in-out"
        } ${isOpen ? "border-l overflow-visible" : "border-l-0 pointer-events-none"}`}
      >
        {isOpen && (
          <ResizeHandle
            side="left"
            isDragging={isAiDragging}
            {...aiHandleProps}
          />
        )}
        <div
          style={{ width: `${aiPanelWidth}px`, minWidth: `${aiPanelWidth}px` }}
          className={`flex-1 min-h-0 overflow-hidden transition-transform duration-200 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SubjectAiPanelPage subjectName={subjectName} />
        </div>
      </aside>
    </div>
    
  );
}
