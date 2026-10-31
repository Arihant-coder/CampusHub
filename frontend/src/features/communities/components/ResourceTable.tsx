/**
 * @file ResourceTable.tsx
 * @description List view for displaying academic notes and PYQs with secure signed URL access.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { FileText, Download, ExternalLink, Calendar, BookOpen, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceNote } from "../services/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

interface ResourceTableProps {
  resources: ResourceNote[];
  isLoading: boolean;
  emptyMessage: string;
  onDeleteResource?: (resourceId: string, storagePath: string) => Promise<void>;
}

export function ResourceTable({
  resources,
  isLoading,
  emptyMessage,
  onDeleteResource,
}: ResourceTableProps) {
  const { user } = useAuth();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days < 1) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const handleOpenDocument = async (item: ResourceNote) => {
    if (!item.storagePath) {
      toast.error("File storage path is missing.");
      return;
    }

    try {
      setOpeningId(item.id);
      // Fetch signed URL valid for 2 minutes from private subject-notes bucket
      const { data, error } = await supabase.storage
        .from("subject-notes")
        .createSignedUrl(item.storagePath, 120);

      if (error || !data?.signedUrl) {
        toast.error(error?.message || "Failed to generate document download link.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Failed to open document.");
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (item: ResourceNote) => {
    if (!onDeleteResource || !window.confirm(`Delete "${item.title}"?`)) return;

    try {
      setDeletingId(item.id);
      await onDeleteResource(item.id, item.storagePath);
      toast.success("Document deleted.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-3 space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center space-y-2">
        <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-foreground">No resources found</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card divide-y overflow-hidden shadow-xs">
      {resources.map((item) => {
        const canDelete =
          onDeleteResource &&
          user &&
          (user.handle === item.uploaderHandle || user.role === "moderator" || user.role === "admin");

        return (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:px-4 sm:py-3.5 hover:bg-muted/40 transition-colors group"
          >
            {/* File Name & Icon */}
            <div
              className="flex items-center gap-3 min-w-0 cursor-pointer"
              onClick={() => handleOpenDocument(item)}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="truncate">
                <span className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate block">
                  {item.title}
                </span>
              </div>
            </div>

            {/* Metadata & Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 text-xs text-muted-foreground pl-11 sm:pl-0">
              <span className="font-medium text-foreground/80">
                {item.uploaderHandle}
              </span>
              <span>•</span>
              <span>
                {item.fileSizeBytes && item.fileSizeBytes > 0
                  ? `${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`
                  : item.pageCount
                  ? `${item.pageCount} pages`
                  : "PDF"}
              </span>
              <span>•</span>
              <span>{formatTime(item.createdAt)}</span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 cursor-pointer"
                  title="View / Download PDF"
                  disabled={openingId === item.id}
                  onClick={() => handleOpenDocument(item)}
                >
                  {openingId === item.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                </Button>

                {canDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                    title="Delete Resource"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    {deletingId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
