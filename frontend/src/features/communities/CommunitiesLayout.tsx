/**
 * @file CommunitiesLayout.tsx
 * @description Layout shell providing persistent SubjectForumsSidebar across all community views with pinning support.
 * @owner Communities Team
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useParams, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { HeaderActions, HeaderCenter } from "@/lib/header-context";
import { Button } from "@/components/ui/button";
import { SubjectForumsSidebar } from "./components/SubjectForumsSidebar";
import { GlobalSearchBar } from "./components/GlobalSearchBar";
import { usePersistentToggle } from "@/lib/use-persistent-toggle";
import { communitiesService } from "./services";
import { useAuth } from "@/lib/auth-context";
import { useUserSubjects } from "@/lib/user-subjects-context";
import type { SubjectForum } from "./services/types";

export interface CommunitiesContextType {
  forums: SubjectForum[];
  activeForum: SubjectForum | null;
  isLoadingLayout: boolean;
  isSidebarOpen: boolean;
  isPinned: boolean;
  isEnrolled: boolean;
  onTogglePin: (subjectId: string) => void;
  onForumUpdated?: (updated: SubjectForum) => void;
}

export default function CommunitiesLayout() {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allSubjects } = useUserSubjects();

  // Keep a stable ref to allSubjects so the pinned-forums effect can read the
  // latest value without declaring it as a reactive dependency (avoids an
  // infinite re-render loop caused by allSubjects getting a new array reference
  // on every render cycle).
  const allSubjectsRef = useRef(allSubjects);
  useEffect(() => {
    allSubjectsRef.current = allSubjects;
  });

  const [isSidebarOpen, setIsSidebarOpen] = usePersistentToggle("campushub:sidebar:communities", true);
  const [enrolledForums, setEnrolledForums] = useState<SubjectForum[]>([]);
  const [pinnedForumsData, setPinnedForumsData] = useState<SubjectForum[]>([]);
  const [activeForum, setActiveForum] = useState<SubjectForum | null>(null);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);

  // Persistent storage key for pinned forums per user
  const pinStorageKey = `campushub:pinned_forums:${user?.id || "guest"}`;

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(pinStorageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const savePinnedIds = (ids: string[]) => {
    setPinnedIds(ids);
    try {
      localStorage.setItem(pinStorageKey, JSON.stringify(ids));
    } catch {
      // ignore
    }
  };

  const isStaff = Boolean(
    user?.role === "admin" ||
      (user?.moderatedSubjectIds && user.moderatedSubjectIds.length > 0)
  );

  // 1. Fetch Enrolled Forums
  useEffect(() => {
    let isMounted = true;
    setIsLoadingLayout(true);
    communitiesService.getSubjectForums().then((res) => {
      if (isMounted && res.data) {
        setEnrolledForums(res.data);
      }
      if (isMounted) setIsLoadingLayout(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Compute Active Pinned IDs: Exclude any subject that is currently in enrolledForums
  const enrolledIds = useMemo(
    () => new Set(enrolledForums.map((f) => f.id.toLowerCase())),
    [enrolledForums]
  );

  // If a pinned subject is enrolled, it is automatically omitted from the pinned area!
  const activePinnedIds = useMemo(
    () => pinnedIds.filter((id) => !enrolledIds.has(id.toLowerCase())),
    [pinnedIds, enrolledIds]
  );

  // 3. Load forum details for pinned forums
  useEffect(() => {
    let isMounted = true;
    if (activePinnedIds.length === 0) {
      setPinnedForumsData([]);
      return;
    }

    Promise.all(
      activePinnedIds.map(async (id) => {
        const res = await communitiesService.getSubjectForum(id);
        if (res.data) {
          return { ...res.data, isPinned: true };
        }
        // Fallback to allSubjects catalog — read from ref to avoid making
        // allSubjects a dependency (would cause an infinite render loop).
        const match = allSubjectsRef.current.find((s) => s.id.toLowerCase() === id.toLowerCase());
        return {
          id,
          name: match?.name || id.toUpperCase(),
          code: match?.code || id.toUpperCase(),
          memberCount: 1,
          isPinned: true,
        };
      })
    ).then((loaded) => {
      if (isMounted) {
        setPinnedForumsData(loaded);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activePinnedIds]);

  // Combined forums for context consumption
  const allForums = useMemo(
    () => [...enrolledForums, ...pinnedForumsData],
    [enrolledForums, pinnedForumsData]
  );

  // 4. Resolve Active Forum
  useEffect(() => {
    let isMounted = true;

    async function resolveActive() {
      if (subjectId) {
        let found = allForums.find((f) => f.id === subjectId);
        if (!found) {
          const res = await communitiesService.getSubjectForum(subjectId);
          if (isMounted && res.data) {
            found = res.data;
          }
        }
        if (isMounted) {
          setActiveForum(found || null);
        }
      } else {
        // Default to first enrolled forum, or first pinned forum
        if (isMounted) {
          setActiveForum(allForums[0] || null);
        }
      }
    }

    void resolveActive();

    return () => {
      isMounted = false;
    };
  }, [subjectId, allForums]);

  const handleSelectSubject = (id: string) => {
    navigate(`/communities/${id}`);
    const selected = allForums.find((f) => f.id === id);
    if (selected) {
      setActiveForum(selected);
    }
  };

  const handlePinSubject = (id: string) => {
    const lowerId = id.toLowerCase();
    if (!pinnedIds.includes(lowerId)) {
      savePinnedIds([...pinnedIds, lowerId]);
    }
  };

  const handleUnpinSubject = (id: string) => {
    const lowerId = id.toLowerCase();
    savePinnedIds(pinnedIds.filter((item) => item.toLowerCase() !== lowerId));
  };

  const handleTogglePin = (id: string) => {
    const lowerId = id.toLowerCase();
    if (activePinnedIds.includes(lowerId)) {
      handleUnpinSubject(lowerId);
    } else {
      handlePinSubject(lowerId);
    }
  };

  const isActiveEnrolled = Boolean(
    activeForum && enrolledIds.has(activeForum.id.toLowerCase())
  );
  const isActivePinned = Boolean(
    activeForum && activePinnedIds.includes(activeForum.id.toLowerCase())
  );

  // Handle updated forum data (e.g. after community image changes)
  const handleForumUpdated = (updated: SubjectForum) => {
    setActiveForum(updated);
    setEnrolledForums((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f))
    );
    setPinnedForumsData((prev) =>
      prev.map((f) => (f.id === updated.id ? updated : f))
    );
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
        enrolledForums={enrolledForums}
        pinnedForums={pinnedForumsData}
        activeSubjectId={activeForum?.id || ""}
        isLoading={isLoadingLayout}
        onSelectSubject={handleSelectSubject}
        onUnpinSubject={handleUnpinSubject}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-w-0">
        <Outlet
          context={{
            forums: allForums,
            activeForum,
            isLoadingLayout,
            isSidebarOpen,
            isPinned: isActivePinned,
            isEnrolled: isActiveEnrolled,
            onTogglePin: handleTogglePin,
            onForumUpdated: handleForumUpdated,
          }}
        />
      </div>
    </div>
  );
}
