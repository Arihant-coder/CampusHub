/**
 * @file UploadModal.tsx
 * @description Dialog modal for uploading study notes or PYQ exam papers.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { Upload, Loader2, FileUp } from "lucide-react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <DialogTitle>Submit Academic Resource</DialogTitle>
          <DialogDescription>
            Share lecture notes or exam question papers with the{" "}
            <span className="font-semibold text-foreground">{subjectName}</span> community.
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
                    setFile(e.target.files[0]);
                    if (!title) {
                      setTitle(e.target.files[0].name);
                    }
                  }
                }}
              />
            </label>
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
                  Uploading...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
