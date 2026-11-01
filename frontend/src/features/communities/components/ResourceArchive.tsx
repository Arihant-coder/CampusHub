/**
 * @file ResourceArchive.tsx
 * @description Academic Resource Archive view with Notes/PYQs sub-tabs, filters, and submit modal.
 * @owner Communities Team
 */

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResourceTable } from "./ResourceTable";
import { UploadModal } from "./UploadModal";
import type { ResourceNote, ResourceType, ResourceCategory } from "../services/types";
import { useAuth } from "@/lib/auth-context";
import { canModerate } from "@/shared/user";

interface ResourceArchiveProps {
  subjectId?: string;
  notes: ResourceNote[];
  pyqs: ResourceNote[];
  isLoadingNotes: boolean;
  isLoadingPyqs: boolean;
  subjectName: string;
  onUploadResource: (data: {
    title: string;
    type: ResourceType;
    category?: ResourceCategory;
    pageCount?: number;
    file?: File;
  }) => Promise<void>;
}

export function ResourceArchive({
  subjectId,
  notes,
  pyqs,
  isLoadingNotes,
  isLoadingPyqs,
  subjectName,
  onUploadResource,
}: ResourceArchiveProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = canModerate(user, subjectId);
  const [subTab, setSubTab] = useState<"Notes" | "PYQs">("Notes");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Filters for Notes
  const [noteCategory, setNoteCategory] = useState<ResourceCategory>("Day wise");
  const [noteSort, setNoteSort] = useState<"Newest" | "Oldest">("Newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (noteCategory !== "All") {
      result = result.filter((n) => n.category === noteCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.uploaderName || n.uploaderHandle || "").toLowerCase().includes(q)
      );
    }

    if (noteSort === "Newest") {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return result;
  }, [notes, noteCategory, noteSort, searchQuery]);

  // Filtered PYQs
  const filteredPyqs = useMemo(() => {
    let result = [...pyqs];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.uploaderName || n.uploaderHandle || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return result;
  }, [pyqs, searchQuery]);

  return (
    <div className="space-y-4 pt-2">
      {/* Sub-tab navigation bar with Submit button on right */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Notes & PYQs pill buttons matching wireframe */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSubTab("Notes");
              setSearchQuery("");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              subTab === "Notes"
                ? "bg-secondary text-foreground border-primary/40 shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab("PYQs");
              setSearchQuery("");
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
              subTab === "PYQs"
                ? "bg-secondary text-foreground border-primary/40 shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            PYQs
          </button>
        </div>

        {/* Action Buttons: Review Queue (Staff only) + Share Resource */}
        <div className="flex items-center gap-2">
          {isStaff && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigate(subjectId ? `/communities/${subjectId}/moderation` : "/communities/moderation")
              }
              className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Review Queue</span>
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              if (subjectId) {
                navigate(`/communities/${subjectId}/share`);
              } else {
                setIsUploadOpen(true);
              }
            }}
            className="h-8 gap-1.5 text-xs font-semibold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{subTab === "Notes" ? "Share Notes" : "Share PYQ"}</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar matching wireframe 2 & 3 */}
      <div className="rounded-xl border bg-card/60 p-2.5 sm:p-3 flex flex-wrap items-center gap-2.5 text-xs">
        <span className="font-semibold text-muted-foreground mr-1 text-xs">Filters</span>

        {subTab === "Notes" && (
          <>
            {/* Category Filter Dropdown (Day wise, Unit wise, Other, Show All) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 font-medium">
                  <span>{noteCategory === "All" ? "Show All" : noteCategory}</span>
                  <span className="text-muted-foreground text-[10px]">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => setNoteCategory("All")}>
                  Show All
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNoteCategory("Day wise")}>
                  Day wise
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNoteCategory("Unit wise")}>
                  Unit wise
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNoteCategory("Other")}>
                  Other
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 font-medium">
                  <span>Sort: {noteSort}</span>
                  <span className="text-muted-foreground text-[10px]">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32">
                <DropdownMenuItem onClick={() => setNoteSort("Newest")}>
                  Newest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNoteSort("Oldest")}>
                  Oldest
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        {/* Search Input */}
        <div className="relative flex-1 min-w-[140px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* Resource Table view */}
      {subTab === "Notes" ? (
        <ResourceTable
          resources={filteredNotes}
          isLoading={isLoadingNotes}
          emptyMessage={`No notes found for "${noteCategory}" in ${subjectName}.`}
        />
      ) : (
        <ResourceTable
          resources={filteredPyqs}
          isLoading={isLoadingPyqs}
          emptyMessage={`No previous year question papers found in ${subjectName}.`}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSubmit={onUploadResource}
        subjectName={subjectName}
        defaultType={subTab === "Notes" ? "Note" : "PYQ"}
      />
    </div>
  );
}

