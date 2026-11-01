/**
 * @file CommunitiesLayout.tsx
 * @description Layout shell providing persistent SubjectForumsSidebar across all community views.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { HeaderActions, HeaderCenter } from "@/lib/header-context";
import { Button } from "@/components/ui/button";
import { SubjectForumsSidebar } from "./components/SubjectForumsSidebar";
import { GlobalSearchBar } from "./components/GlobalSearchBar";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { communitiesService } from "./services";
import { useAuth } from "@/lib/auth-context";
import type { SubjectForum } from "./services/types";

export interface CommunitiesContextType {
  forums: SubjectForum[];
  activeForum: SubjectForum | null;
  isSidebarOpen: boolean;
}

export default function CommunitiesLayout() {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = usePersistentToggle("campushub:sidebar:communities", true);
  const [forums, setForums] = useState<SubjectForum[]>([]);
  const [activeForum, setActiveForum] = useState<SubjectForum | null>(null);

  const isStaff = Boolean(
    user?.role === "admin" ||
      (user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0)
  );

  useEffect(() => {
    let isMounted = true;
    communitiesService.getSubjectForums().then((res) => {
      if (isMounted && res.data) {
        setForums(res.data);
        const selected =
          res.data.find((f) => f.id === subjectId) || res.data[0] || null;
        setActiveForum(selected);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  const handleSelectSubject = (id: string) => {
    navigate(`/communities/${id}`);
    const selected = forums.find((f) => f.id === id);
    if (selected) {
      setActiveForum(selected);
    }
  };

  return (
    <div className="flex h-[calc(100vh-5.5rem)] -m-4 md:-m-6 lg:-m-8 overflow-hidden bg-background relative">
      {/* Centered Global Header Search */}
      <HeaderCenter>
        <GlobalSearchBar />
      </HeaderCenter>

      {/* Top Header Actions (Right) */}
      <HeaderActions>
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(
                  activeForum
                    ? `/communities/${activeForum.id}/moderation`
                    : "/communities/moderation"
                )
              }
              className="h-8 gap-1.5 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 shadow-xs cursor-pointer"
              title="Moderation Queue"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Review Queue</span>
            </Button>
          )}
        </div>
      </HeaderActions>

      {/* Persistent Subject Forums Sidebar */}
      <SubjectForumsSidebar
        forums={forums}
        activeSubjectId={activeForum?.id || ""}
        onSelectSubject={handleSelectSubject}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <Outlet context={{ forums, activeForum, isSidebarOpen }} />
      </div>
    </div>
  );
}

