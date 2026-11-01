/**
 * @file UploadModal.tsx
 * @description Dialog modal for uploading study notes or PYQ exam papers.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { Upload, Loader2, FileUp, Sparkles, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResourceCategory, ResourceType } from "../services/types";
import { PdfOptimizerModal } from "./PdfOptimizerModal";
import { toast } from "sonner";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: ResourceType;
    category?: ResourceCategory;
    pageCount?: number;
    file?: File;
  }) => Promise<void>;
  subjectName: string;
  defaultType?: ResourceType;
}

export function UploadModal({
  isOpen,
  onClose,
  onSubmit,
  subjectName,
  defaultType = "Note",
}: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>(defaultType);
  const [category, setCategory] = useState<ResourceCategory>("Day wise");
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFileOverLimit = file ? file.size > 5 * 1024 * 1024 : false;

  const handleApplyOptimization = (
    compressedFile: File,
    stats: { originalSize: number; compressedSize: number }
  ) => {
    setFile(compressedFile);
    setCompressionStats(stats);
    toast.success(
      `Optimized from ${(stats.originalSize / (1024 * 1024)).toFixed(2)} MB to ${(
        stats.compressedSize / (1024 * 1024)
      ).toFixed(2)} MB!`
    );
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
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        title: title.trim(),
        type,
        category,
        pageCount: 1,
        file: file || undefined,
      });
      setTitle("");
      setFile(null);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Academic Resource for Review</DialogTitle>
          <DialogDescription>
            Contribute study notes or PYQ exam papers to the{" "}
            <span className="font-semibold text-foreground">{subjectName}</span> community. An admin or
            moderator will review and publish it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Resource Type</label>
            <Select
              value={type}
              onValueChange={(val) => setType(val as ResourceType)}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Note">Lecture / Class Notes</SelectItem>
                <SelectItem value="PYQ">Previous Year Questions (PYQs)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Document Title</label>
            <Input
              placeholder={type === "Note" ? "e.g. Day1-ABCD.pdf" : "e.g. 2021 End sem.pdf"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {type === "Note" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Categorization</label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as ResourceCategory)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Day wise">Day wise</SelectItem>
                  <SelectItem value="Unit wise">Unit wise</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Upload PDF (optional)</label>
            <label className="border border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer transition-colors">
              <FileUp className="h-5 w-5 mb-1 text-primary" />
              <span>{file ? file.name : "Select or drag PDF file"}</span>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const selected = e.target.files[0];
                    setFile(selected);
                    setOriginalFile(selected);
                    setCompressionStats(null);
                    if (!title) {
                      setTitle(selected.name.replace(/\.pdf$/i, ""));
                    }
                  }
                }}
              />
            </label>

            {/* Optimizer banner if PDF selected */}
            {file && (
              <div className="rounded-lg border p-2.5 bg-card/60 space-y-1.5 text-xs">
                {isFileOverLimit ? (
                  <div className="flex items-center justify-between gap-2 text-destructive font-medium flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB (exceeds 5 MB limit)</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setIsOptimizerOpen(true)}
                      className="h-6 text-[11px] gap-1 px-2 font-semibold cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" />
                      Compress & Preview
                    </Button>
                  </div>
                ) : compressionStats ? (
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      Optimized: {(compressionStats.compressedSize / (1024 * 1024)).toFixed(2)} MB
                      (-{Math.round((1 - compressionStats.compressedSize / compressionStats.originalSize) * 100)}%)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsOptimizerOpen(true)}
                        className="h-5 text-[10px] gap-1 px-1.5 cursor-pointer"
                      >
                        Adjust
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRevert}
                        className="h-5 text-[10px] gap-1 px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <RotateCcw className="h-2.5 w-2.5" />
                        Revert
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 flex-wrap text-muted-foreground">
                    <span className="text-[11px]">Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOptimizerOpen(true)}
                      className="h-6 text-[11px] gap-1 px-2 font-medium cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Optimize PDF</span>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* PDF Optimizer & Preview Modal */}
      <PdfOptimizerModal
        isOpen={isOptimizerOpen}
        file={originalFile || file}
        onClose={() => setIsOptimizerOpen(false)}
        onApply={handleApplyOptimization}
      />
    </Dialog>
  );
}
