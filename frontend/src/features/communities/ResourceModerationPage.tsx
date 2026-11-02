/**
 * @file ResourceModerationPage.tsx
 * @description Dedicated review and moderation portal for admins and moderators to inspect,
 *              categorize, and approve/reject student-submitted notes and PYQ papers.
 *              On approval, the file is migrated to community shared storage and published to all students.
 * @owner Communities Team
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { communitiesService } from "./services";
import type { ResourceNote, ResourceCategory, ResourceType, SubjectForum, Report } from "./services/types";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";

export const ResourceModerationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subjectId: urlSubjectId } = useParams<{ subjectId?: string }>();

  const [activeTab, setActiveTab] = useState<"resources" | "reports">("resources");
  const [pendingNotes, setPendingNotes] = useState<ResourceNote[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [forums, setForums] = useState<SubjectForum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Filters & Sorting state
  const [selectedSubject, setSelectedSubject] = useState<string>(urlSubjectId || "all");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [reportTargetFilter, setReportTargetFilter] = useState<"all" | "post" | "comment">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "size_desc" | "size_asc">("newest");

  // Category selections mapped by resource id (allows moderators to reclassify before accepting)
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, ResourceCategory>>({});

  // Document preview loading state
  const [openingId, setOpeningId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pendingRes, forumsRes, reportsRes] = await Promise.all([
        communitiesService.getPendingResources
          ? communitiesService.getPendingResources(selectedSubject === "all" ? undefined : selectedSubject)
          : Promise.resolve({ data: [] as ResourceNote[], error: null }),
        communitiesService.getSubjectForums(),
        communitiesService.getReports
          ? communitiesService.getReports(selectedSubject === "all" ? undefined : selectedSubject)
          : Promise.resolve({ data: [] as Report[], error: null }),
      ]);

      if (pendingRes.data) {
        let filteredNotes = pendingRes.data;
        if (user && user.role !== "admin") {
          filteredNotes = filteredNotes.filter((n) =>
            user.moderatedSubjectIds?.includes(n.subjectId)
          );
        }
        setPendingNotes(filteredNotes);
        const initialOverrides: Record<string, ResourceCategory> = {};
        filteredNotes.forEach((note) => {
          initialOverrides[note.id] = note.category || "Other";
        });
        setCategoryOverrides(initialOverrides);
      }

      if (reportsRes.data) {
        let filteredReports = reportsRes.data;
        if (user && user.role !== "admin") {
          filteredReports = filteredReports.filter((r) =>
            user.moderatedSubjectIds?.includes(r.subjectId)
          );
        }
        setReports(filteredReports);
      }

      if (forumsRes.data) {
        setForums(forumsRes.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load moderation queue.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject, user]);

  const handleResolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
    try {
      setIsProcessingId(reportId);
      if (communitiesService.resolveReport) {
        await communitiesService.resolveReport(reportId, status);
      }
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success(`Report marked as ${status}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update report.");
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDeleteReportedContent = async (report: Report) => {
    const isComment = report.targetType === "comment";
    const label = isComment ? "comment" : report.targetType === "post" ? "post" : "resource";
    if (
      !window.confirm(
        `Are you sure you want to permanently delete this ${label} and mark the report resolved?`
      )
    ) {
      return;
    }

    try {
      setIsProcessingId(report.id);
      if (isComment && communitiesService.deleteComment) {
        await communitiesService.deleteComment(report.targetId);
      } else if (report.targetType === "post" && communitiesService.deletePost) {
        await communitiesService.deletePost(report.targetId);
      } else if (report.targetType === "note" && communitiesService.deleteResource) {
        await communitiesService.deleteResource(report.targetId, "");
      }

      if (communitiesService.resolveReport) {
        await communitiesService.resolveReport(report.id, "resolved");
      }

      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success(`Reported ${label} deleted and report resolved.`);
    } catch (err: any) {
      toast.error(err.message || `Failed to delete reported ${label}.`);
    } finally {
      setIsProcessingId(null);
    }
  };

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Handle Approve: moves file to community storage and publishes to public community archive
  const handleApprove = async (note: ResourceNote) => {
    const chosenCategory = categoryOverrides[note.id] || note.category || "Other";
    try {
      setIsProcessingId(note.id);
      if (communitiesService.approveResource) {
        const res = await communitiesService.approveResource(note.id, chosenCategory);
        if (res.error) {
          toast.error(res.error.message || "Failed to approve resource.");
          return;
        }
      }

      setPendingNotes((prev) => prev.filter((p) => p.id !== note.id));
      toast.success(
        `"${note.title}" approved and published to ${chosenCategory}.`
      );
    } catch (err: any) {
      toast.error(err.message || "An error occurred while approving.");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handle Reject: deletes file from storage and marks record rejected, freeing user's personal quota
  const handleReject = async (note: ResourceNote) => {
    if (!window.confirm(`Are you sure you want to reject and discard "${note.title}"?`)) {
      return;
    }

    try {
      setIsProcessingId(note.id);
      if (communitiesService.rejectResource) {
        const res = await communitiesService.rejectResource(note.id, note.storagePath);
        if (res.error) {
          toast.error(res.error.message || "Failed to reject resource.");
          return;
        }
      }

      setPendingNotes((prev) => prev.filter((p) => p.id !== note.id));
      toast.info(`"${note.title}" rejected and purged from storage.`);
    } catch (err: any) {
      toast.error(err.message || "An error occurred while rejecting.");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Open / Preview document
  const handleOpenDocument = async (note: ResourceNote) => {
    if (!note.storagePath) {
      toast.error("File storage path is missing.");
      return;
    }

    try {
      setOpeningId(note.id);
      const res = communitiesService.getDocumentUrl
        ? await communitiesService.getDocumentUrl(note.storagePath)
        : { data: null, error: { code: "UNSUPPORTED", message: "Preview unavailable" } };

      if (res.error || !res.data) {
        toast.error(res.error?.message || "Document preview unavailable in current environment.");
        return;
      }

      window.open(res.data, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast.error(err.message || "Failed to open document preview.");
    } finally {
      setOpeningId(null);
    }
  };

  // Filtered and Sorted list
  const filteredNotes = useMemo(() => {
    let result = [...pendingNotes];

    if (typeFilter !== "all") {
      result = result.filter((n) => n.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || (n.uploaderName || n.uploaderHandle || "").toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "size_desc") {
        return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
      }
      if (sortBy === "size_asc") {
        return (a.fileSizeBytes || 0) - (b.fileSizeBytes || 0);
      }
      return 0;
    });

    return result;
  }, [pendingNotes, typeFilter, searchQuery, sortBy]);

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (reportTargetFilter !== "all") {
      result = result.filter((r) => r.targetType === reportTargetFilter);
    }

    if (selectedSubject !== "all") {
      result = result.filter((r) => r.subjectId === selectedSubject);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const reporter = (r.reporterName || r.reporterHandle || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        const author = (r.targetContent?.authorName || r.targetContent?.authorHandle || "").toLowerCase();
        const title = (r.targetContent?.title || "").toLowerCase();
        const body = (r.targetContent?.body || "").toLowerCase();
        return (
          reporter.includes(q) ||
          reason.includes(q) ||
          author.includes(q) ||
          title.includes(q) ||
          body.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [reports, reportTargetFilter, selectedSubject, searchQuery, sortBy]);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const formatTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 -ml-1 cursor-pointer"
            onClick={() => navigate("/communities")}
            title="Back to Communities"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Moderation</span>
            <span className="text-xs font-normal text-muted-foreground">
              {activeTab === "reports"
                ? `${reports.filter((r) => r.status === "pending").length} pending`
                : `${pendingNotes.length} pending`}
            </span>
          </h1>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={loadPending}
          disabled={isLoading}
          className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
        </Button>
      </div>

      {/* Moderation Section Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/50 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === "reports"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          Reports ({reports.filter((r) => r.status === "pending").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
            activeTab === "resources"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          }`}
        >
          Resources ({pendingNotes.length})
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          {/* Subject Filter */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              {user?.role === "admin" && <SelectItem value="all">All Subjects</SelectItem>}
              {forums
                .filter((forum) => user?.role === "admin" || user?.moderatedSubjectIds?.includes(forum.id))
                .map((forum) => (
                  <SelectItem key={forum.id} value={forum.id}>
                    {forum.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          {activeTab === "resources" ? (
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50 text-xs">
              {(["all", "Note", "PYQ"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-colors ${
                    typeFilter === t
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t === "Note" ? "Notes" : "PYQs"}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/50 text-xs">
              {(["all", "post", "comment"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReportTargetFilter(t)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md cursor-pointer transition-colors ${
                    reportTargetFilter === t
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "all" ? "All" : t === "post" ? "Posts" : "Comments"}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div className="relative flex-1 min-w-[120px] max-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/30"
            />
          </div>
        </div>

        {/* Right: Sorting */}
        <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
          <SelectTrigger className="h-8 text-xs w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="size_desc">Largest</SelectItem>
            <SelectItem value="size_asc">Smallest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs">Loading queue...</span>
        </div>
      ) : activeTab === "reports" ? (
        filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center space-y-1 bg-card/40">
            <h3 className="text-sm font-semibold text-foreground">No reports</h3>
            <p className="text-xs text-muted-foreground">All flagged items have been handled.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const target = report.targetContent;
              const hasTarget = target && target.exists !== false;
              const targetUrl =
                target?.postId && (target.subjectId || report.subjectId)
                  ? `/communities/${target.subjectId || report.subjectId}/post/${target.postId}`
                  : null;

              return (
                <Card key={report.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-3">
                  {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold bg-muted text-muted-foreground border border-border/50">
                        {report.subjectId.toUpperCase()}
                      </span>
                      <span className="rounded px-2 py-0.5 text-[11px] font-medium bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                        {report.reason}
                      </span>
                      {target?.authorHandle && (
                        <span className="text-muted-foreground">
                          • @{target.authorHandle}
                        </span>
                      )}
                    </div>

                    <div className="text-muted-foreground text-xs">
                      Reported by @{report.reporterHandle || "user"} • {formatTime(report.createdAt)}
                    </div>
                  </div>

                  {/* Target Content */}
                  {hasTarget ? (
                    <div className="space-y-1 pt-0.5">
                      {target.title && report.targetType === "post" && (
                        <h4 className="text-sm font-semibold text-foreground">
                          {target.title}
                        </h4>
                      )}
                      {target.body && (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed line-clamp-3">
                          {target.body}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Content already removed
                    </p>
                  )}

                  {/* Footer: View Link & Concise Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                    <div>
                      {targetUrl && (
                        <button
                          type="button"
                          onClick={() => navigate(targetUrl)}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium cursor-pointer"
                        >
                          <span>View {report.targetType}</span>
                          <ExternalLink className="size-3" />
                        </button>
                      )}
                    </div>

                    {report.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isProcessingId === report.id}
                          onClick={() => handleResolveReport(report.id, "dismissed")}
                          className="h-7 text-xs px-3 cursor-pointer"
                        >
                          Dismiss
                        </Button>
                        {hasTarget && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isProcessingId === report.id}
                            onClick={() => handleDeleteReportedContent(report)}
                            className="h-7 text-xs px-3 cursor-pointer shadow-xs"
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center space-y-1 bg-card/40">
          <h3 className="text-sm font-semibold text-foreground">No pending resources</h3>
          <p className="text-xs text-muted-foreground">All student notes and papers have been reviewed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => {
            const isProcessing = isProcessingId === note.id;
            const isOpening = openingId === note.id;
            const currentCategory = categoryOverrides[note.id] || note.category || "Other";

            return (
              <Card
                key={note.id}
                className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold bg-muted text-muted-foreground border border-border/50">
                      {note.subjectId.toUpperCase()}
                    </span>
                    <span className="rounded px-2 py-0.5 text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                      {note.type}
                    </span>
                    <span className="text-muted-foreground">
                      • @{note.uploaderHandle}
                    </span>
                  </div>

                  <div className="text-muted-foreground text-xs">
                    {formatTime(note.createdAt)} • {formatSize(note.fileSizeBytes)}
                    {note.pageCount ? ` • ${note.pageCount}p` : ""}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground truncate">{note.title}</h4>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50 flex-wrap">
                  <div className="flex items-center gap-2">
                    {note.type === "Note" && (
                      <Select
                        value={currentCategory}
                        onValueChange={(val: ResourceCategory) =>
                          setCategoryOverrides((prev) => ({ ...prev, [note.id]: val }))
                        }
                        disabled={isProcessing}
                      >
                        <SelectTrigger className="h-7 text-xs w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Day wise">Day wise</SelectItem>
                          <SelectItem value="Unit wise">Unit wise</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDocument(note)}
                      disabled={isOpening || isProcessing}
                      className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                    >
                      {isOpening ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
                      <span>Preview</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(note)}
                      disabled={isProcessing}
                      className="h-7 text-xs px-3 text-destructive hover:bg-destructive/10 border-destructive/30 cursor-pointer"
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApprove(note)}
                      disabled={isProcessing}
                      className="h-7 text-xs px-3 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      {isProcessing ? <Loader2 className="size-3 animate-spin" /> : "Approve"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourceModerationPage;
