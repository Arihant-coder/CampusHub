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
  ShieldCheck,
  ArrowLeft,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  User,
  ExternalLink,
  Loader2,
  HardDrive,
  Search,
  MessageSquare,
  Trash2,
  Flag,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FormattedText } from "./components/FormattedText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { communitiesService } from "./services";
import type { ResourceNote, ResourceCategory, ResourceType, SubjectForum, Report } from "./services/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
        `"${note.title}" approved! Moved to community storage and published to ${chosenCategory}.`
      );
    } catch (err: any) {
      toast.error(err.message || "An error occurred while approving.");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handle Reject: deletes file from storage and purges record, freeing user's personal quota
  const handleReject = async (note: ResourceNote) => {
    if (!window.confirm(`Are you sure you want to reject and discard "${note.title}"?`)) {
      return;
    }

    try {
      setIsProcessingId(note.id);
      if (communitiesService.rejectResource) {
        const res = await communitiesService.rejectResource(note.id);
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
      const { data, error } = await supabase.storage
        .from("subject-notes")
        .createSignedUrl(note.storagePath, 120);

      if (error || !data?.signedUrl) {
        toast.error(error?.message || "Document preview unavailable in current environment.");
        return;
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
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

  const getSubjectName = (subjectId: string) => {
    const found = forums.find((f) => f.id === subjectId);
    return found ? found.name : subjectId.toUpperCase();
  };

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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              onClick={() => navigate("/communities")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Communities</span>
            </Button>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span>Community Moderation Portal</span>
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5">
              {user?.role === "admin" ? "Global Admin Scope" : `${user?.moderatedSubjectIds?.length || 0} Assigned Subject(s)`}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Review student-submitted lecture notes, PYQs, and flagged reports within your authorized subject communities.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadPending}
          disabled={isLoading}
          className="h-8 text-xs gap-1.5 cursor-pointer self-start sm:self-center"
        >
          {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh Queue"}
        </Button>
      </div>

      {/* Moderation Section Tabs */}
      <div className="flex items-center gap-2 border-b pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("resources")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "resources"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Pending Resources ({pendingNotes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeTab === "reports"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          Reports Queue ({reports.filter((r) => r.status === "pending").length})
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-xl border bg-card/60 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span className="font-semibold text-[11px] uppercase tracking-wider">Filter:</span>
          </div>

          {/* Subject Filter */}
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
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
          <div className="flex items-center bg-secondary/80 rounded-md p-0.5 border text-xs">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer ${
                typeFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("Note")}
              className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer ${
                typeFilter === "Note"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Notes
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("PYQ")}
              className={`px-2 py-1 text-[11px] font-medium rounded cursor-pointer ${
                typeFilter === "PYQ"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              PYQs
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[140px] max-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search title or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Right: Sorting */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-[11px] font-medium">Sort:</span>
          <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="size_desc">Largest File</SelectItem>
              <SelectItem value="size_asc">Smallest File</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <span className="text-xs">Loading moderation queue...</span>
        </div>
      ) : activeTab === "reports" ? (
        reports.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center space-y-2 bg-card/40">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No Active Reports</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              All community reports within your moderation scope have been addressed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const target = report.targetContent;
              const hasTarget = target && target.exists !== false;
              const targetUrl =
                target?.postId && (target.subjectId || report.subjectId)
                  ? `/communities/${target.subjectId || report.subjectId}/post/${target.postId}`
                  : null;

              return (
                <Card key={report.id} className="overflow-hidden border bg-card shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Top Meta Row */}
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase">
                          {report.subjectId}
                        </Badge>
                        <Badge
                          variant={report.targetType === "comment" ? "secondary" : "default"}
                          className="text-[10px] uppercase font-mono gap-1"
                        >
                          {report.targetType === "comment" ? (
                            <MessageSquare className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          <span>Flagged {report.targetType}</span>
                        </Badge>
                        <Badge
                          variant={report.status === "pending" ? "destructive" : "secondary"}
                          className="text-[10px] capitalize font-medium"
                        >
                          {report.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Reported {formatTime(report.createdAt)} by</span>
                        <span className="font-semibold text-foreground">
                          @{report.reporterHandle || report.reporterName || "user"}
                        </span>
                      </div>
                    </div>

                    {/* Reported Content Box: The actual comment or post reported */}
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs">
                          <Avatar className="h-5 w-5 border">
                            {target?.authorAvatarUrl && (
                              <AvatarImage src={target.authorAvatarUrl} alt={target.authorHandle || "Author"} />
                            )}
                            <AvatarFallback className="text-[9px] font-semibold bg-secondary">
                              {(target?.authorHandle || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground">
                            @{target?.authorHandle || "unknown_author"}
                          </span>
                          {report.targetType === "comment" && target?.title && (
                            <span className="text-muted-foreground truncate max-w-xs">
                              on post: &ldquo;{target.title}&rdquo;
                            </span>
                          )}
                        </div>

                        {targetUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(targetUrl)}
                            className="h-6 px-2 text-[11px] gap-1 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                          >
                            <span>View in Community</span>
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      {hasTarget ? (
                        <div className="space-y-1.5 pt-1">
                          {target.title && report.targetType === "post" && (
                            <h4 className="text-sm font-bold text-foreground">
                              {target.title}
                            </h4>
                          )}
                          {target.body && (
                            <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-background/80 p-2.5 rounded-lg border border-border/50">
                              <FormattedText content={target.body} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground italic py-1 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span>This content has already been removed or is no longer available.</span>
                        </div>
                      )}
                    </div>

                    {/* Report Reason Box */}
                    <div className="flex items-start gap-2.5 bg-destructive/5 border border-destructive/20 text-xs p-3 rounded-xl">
                      <Flag className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <span className="font-semibold text-destructive">
                          Reason for Report:
                        </span>
                        <p className="text-foreground/90 leading-snug">
                          &ldquo;{report.reason}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons for Moderators */}
                    {report.status === "pending" && (
                      <div className="flex items-center justify-between gap-3 pt-1 border-t flex-wrap">
                        <div className="flex items-center gap-2">
                          {hasTarget && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={isProcessingId === report.id}
                              onClick={() => handleDeleteReportedContent(report)}
                              className="h-8 text-xs gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete {report.targetType === "comment" ? "Comment" : "Post"}</span>
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isProcessingId === report.id}
                            onClick={() => handleResolveReport(report.id, "dismissed")}
                            className="h-8 text-xs gap-1.5 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Dismiss Report</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={isProcessingId === report.id}
                            onClick={() => handleResolveReport(report.id, "resolved")}
                            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Mark Resolved</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-2 bg-card/40">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Moderation Queue is Clear</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {pendingNotes.length === 0
              ? "There are currently no student resources waiting for review. Community archives are up to date."
              : "No resources matched your current filter criteria."}
          </p>
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
                className="overflow-hidden border transition-all hover:border-primary/40 bg-card/80"
              >
                <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Document Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant={note.type === "Note" ? "default" : "secondary"}
                        className="text-[10px] font-semibold px-2 py-0.5"
                      >
                        {note.type}
                      </Badge>

                      <Badge variant="outline" className="text-[11px] text-foreground font-medium">
                        {getSubjectName(note.subjectId)}
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                      >
                        Pending Review
                      </Badge>
                    </div>

                    <h3 className="text-sm font-semibold text-foreground truncate">{note.title}</h3>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{note.uploaderName || note.uploaderHandle || "Contributor"}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(note.createdAt)}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        <span>{formatSize(note.fileSizeBytes)}</span>
                      </span>
                      {note.pageCount && note.pageCount > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>
                            {note.pageCount} {note.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Category Override & Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                    {/* Category Selector */}
                    {note.type === "Note" && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                          Category:
                        </span>
                        <Select
                          value={currentCategory}
                          onValueChange={(val: ResourceCategory) =>
                            setCategoryOverrides((prev) => ({ ...prev, [note.id]: val }))
                          }
                          disabled={isProcessing}
                        >
                          <SelectTrigger className="h-8 text-xs w-[125px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Day wise">Day wise</SelectItem>
                            <SelectItem value="Unit wise">Unit wise</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Preview Document Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDocument(note)}
                      disabled={isOpening || isProcessing}
                      className="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      {isOpening ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ExternalLink className="h-3.5 w-3.5" />
                      )}
                      <span>Preview</span>
                    </Button>

                    {/* Reject Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleReject(note)}
                      disabled={isProcessing}
                      className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60 cursor-pointer"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </Button>

                    {/* Approve Button */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApprove(note)}
                      disabled={isProcessing}
                      className="h-8 text-xs gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResourceModerationPage;
