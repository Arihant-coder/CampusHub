/**
 * @file ShareResourcePage.tsx
 * @description Dedicated academic resource sharing page with community guidelines,
 *              live storage quota tracking, on-demand client-side PDF compression,
 *              and duplicate prevention checklist.
 * @owner Communities Team
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FileUp,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Info,
  Loader2,
  Search,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { communitiesService } from "./services";
import type { ResourceType, ResourceCategory } from "./services/types";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  compressPdf,
  type CompressionProgress,
} from "./utils/pdfCompressor";

export const ShareResourcePage: React.FC = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const [subjectName, setSubjectName] = useState<string>("Subject Community");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("Note");
  const [category, setCategory] = useState<ResourceCategory>("Day wise");
  const [file, setFile] = useState<File | null>(null);

  // Compression state
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotaUsage, setQuotaUsage] = useState<{
    userUsed: number;
    userMax: number;
    globalUsed: number;
    globalMax: number;
  } | null>(null);

  // Fetch subject name & quota usage
  useEffect(() => {
    async function loadData() {
      if (!subjectId) return;

      const forumsRes = await communitiesService.getSubjectForums();
      if (forumsRes.data) {
        const found = forumsRes.data.find((f) => f.id === subjectId);
        if (found) setSubjectName(found.name);
      }

      // Live Quota Fetch via RPC
      try {
        const { data, error } = await supabase.rpc("get_my_storage_usage");
        if (!error && data && data.length > 0) {
          setQuotaUsage({
            userUsed: Number(data[0].user_used) || 0,
            userMax: Number(data[0].user_max) || 52428800,
            globalUsed: Number(data[0].global_used) || 0,
            globalMax: Number(data[0].global_max) || 524288000,
          });
        }
      } catch (err) {
        console.error("Quota inspection error:", err);
      }
    }

    loadData();
  }, [subjectId]);

  const formatMB = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  const isUserQuotaExceeded = Boolean(
    quotaUsage && quotaUsage.userUsed >= quotaUsage.userMax
  );
  const isGlobalQuotaExceeded = Boolean(
    quotaUsage && quotaUsage.globalUsed >= quotaUsage.globalMax
  );

  const isFileOverLimit = file ? file.size > 5 * 1024 * 1024 : false;

  const handleSelectFile = (selected: File) => {
    setFile(selected);
    setOriginalFile(selected);
    setCompressionStats(null);
    setCompressionProgress(null);
    if (!title) {
      setTitle(selected.name.replace(/\.pdf$/i, ""));
    }
  };

  const handleCompress = async () => {
    if (!file || isCompressing) return;

    try {
      setIsCompressing(true);
      setCompressionProgress({ percent: 0, step: "Starting compression..." });

      const result = await compressPdf(
        file,
        { maxDimension: 1600, quality: 0.75 },
        (progress) => setCompressionProgress(progress)
      );

      if (result.savedBytes > 0) {
        setFile(result.file);
        setCompressionStats({
          originalSize: result.originalBytes,
          compressedSize: result.compressedBytes,
        });
        toast.success(
          `Compressed from ${formatMB(result.originalBytes)} MB to ${formatMB(result.compressedBytes)} MB!`
        );
      } else {
        toast.info("This document is already well-optimized.");
      }
    } catch (err: any) {
      console.error("Compression error:", err);
      toast.error(err.message || "Failed to compress PDF.");
    } finally {
      setIsCompressing(false);
      setCompressionProgress(null);
    }
  };

  const handleRevert = () => {
    if (originalFile) {
      setFile(originalFile);
      setCompressionStats(null);
      toast.info("Reverted to original file.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || isSubmitting) return;

    if (!title.trim()) {
      toast.error("Please provide a title for the document.");
      return;
    }

    if (!file) {
      toast.error("Please select a PDF document to upload.");
      return;
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files (.pdf) are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5 MB. Please compress it first.");
      return;
    }

    if (isUserQuotaExceeded || isGlobalQuotaExceeded) {
      toast.error("Community storage quota has been reached. Please contact campus admin.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await communitiesService.uploadResource({
        subjectId,
        title: title.trim(),
        type,
        category,
        pageCount: 1,
        file,
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to publish resource.");
        return;
      }

      toast.success("Resource shared with community successfully!");
      navigate(`/communities/${subjectId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/communities/${subjectId || ""}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {subjectName}</span>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Share Community Resource
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contribute study material, lecture notes, or previous year exam papers to help your peers in{" "}
          <span className="font-semibold text-foreground">{subjectName}</span>.
        </p>
      </div>

      {/* Community Guidelines Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Info className="h-4 w-4" />
            Community Sharing Guidelines
          </CardTitle>
          <CardDescription className="text-xs">
            Please follow these principles before uploading documents:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs text-foreground/90">
          <div className="flex items-start gap-2.5">
            <Search className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Check for duplicates first:</span> Please browse the{" "}
              <Link to={`/communities/${subjectId}`} className="underline text-primary">
                subject archive
              </Link>{" "}
              to ensure this specific note or PYQ question paper is not already uploaded.
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">High academic utility:</span> Ensure the document is legible,
              complete, and genuinely helpful (e.g. clean handwritten notes, solved PYQs, or formula sheets).
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Size and format limit:</span> Uploads are restricted to PDF
              format with a maximum size of 5 MB per document.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Quota Indicator */}
      {quotaUsage && (
        <Card className="border bg-card shadow-xs">
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5 text-foreground">
                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                Your Community Storage Quota:
              </span>
              <span className="font-medium text-muted-foreground">
                {formatMB(quotaUsage.userUsed)} MB / {formatMB(quotaUsage.userMax)} MB (
                {Math.round((quotaUsage.userUsed / quotaUsage.userMax) * 100)}%)
              </span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  isUserQuotaExceeded ? "bg-destructive" : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, Math.round((quotaUsage.userUsed / quotaUsage.userMax) * 100))}%`,
                }}
              />
            </div>
            {isUserQuotaExceeded && (
              <p className="text-[11px] text-destructive font-medium">
                You have reached your 50 MB document upload cap. Please delete older documents before uploading new ones.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Form */}
      <Card className="shadow-xs">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="resource-type" className="text-xs font-semibold">
                  Resource Type
                </Label>
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as ResourceType)}
                >
                  <SelectTrigger id="resource-type" className="text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Note">Lecture / Class Notes</SelectItem>
                    <SelectItem value="PYQ">Previous Year Questions (PYQs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "Note" && (
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">
                    Categorization
                  </Label>
                  <Select
                    value={category}
                    onValueChange={(val) => setCategory(val as ResourceCategory)}
                  >
                    <SelectTrigger id="category" className="text-xs">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day wise">Day wise</SelectItem>
                      <SelectItem value="Unit wise">Unit wise</SelectItem>
                      <SelectItem value="Other">Formula Sheet / Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-semibold">
                Document Title
              </Label>
              <Input
                id="title"
                placeholder={type === "Note" ? "e.g. Unit 3 - Memory Management Notes" : "e.g. 2023 End-Sem Exam Paper & Solutions"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
              />
            </div>

            {/* PDF File Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Document File (PDF only, max 5 MB)</Label>
              <label className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
                <FileUp className="h-8 w-8 mb-2 text-primary" />
                <span className="font-semibold text-foreground">
                  {file ? file.name : "Click or drag PDF file to upload"}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "PDF format only"}
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleSelectFile(e.target.files[0]);
                    }
                  }}
                />
              </label>

              {/* On-Demand PDF Compressor Banner */}
              {file && (
                <div className="rounded-lg border p-3 bg-card/60 space-y-2 text-xs">
                  {isFileOverLimit ? (
                    <div className="flex items-center gap-2 text-destructive font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        File is {(file.size / (1024 * 1024)).toFixed(2)} MB, which exceeds the 5 MB limit.
                      </span>
                    </div>
                  ) : compressionStats ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        Optimized: {(compressionStats.originalSize / (1024 * 1024)).toFixed(2)} MB →{" "}
                        {(compressionStats.compressedSize / (1024 * 1024)).toFixed(2)} MB (Saved{" "}
                        {Math.round(
                          (1 - compressionStats.compressedSize / compressionStats.originalSize) * 100
                        )}
                        %)
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRevert}
                        className="h-6 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Revert
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>
                        File size: {(file.size / (1024 * 1024)).toFixed(2)} MB. Compress to save community quota.
                      </span>
                    </div>
                  )}

                  {/* Progress Indicator */}
                  {isCompressing && compressionProgress && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                          {compressionProgress.step}
                        </span>
                        <span>{compressionProgress.percent}%</span>
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all rounded-full"
                          style={{ width: `${compressionProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Compress Button */}
                  {!compressionStats && !isCompressing && (
                    <Button
                      type="button"
                      variant={isFileOverLimit ? "default" : "outline"}
                      size="sm"
                      onClick={handleCompress}
                      className="w-full h-7 text-xs gap-1.5 font-medium cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {isFileOverLimit ? "Compress to fit 5 MB limit" : "Compress Document (On-Demand)"}
                      </span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/communities/${subjectId || ""}`)}
                disabled={isSubmitting || isCompressing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isCompressing ||
                  !title.trim() ||
                  !file ||
                  isFileOverLimit ||
                  isUserQuotaExceeded ||
                  isGlobalQuotaExceeded
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Publish to Community"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareResourcePage;
