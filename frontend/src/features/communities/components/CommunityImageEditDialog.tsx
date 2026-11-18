/**
 * @file CommunityImageEditDialog.tsx
 * @description Dialog allowing admins and moderators to update community banner and logo images.
 * @owner Communities Team
 */

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, Trash2, Network, Image as ImageIcon } from "lucide-react";
import { processCommunityImage, type ProcessedImageResult } from "../utils/imagePipeline";
import { processLogoImage, type ProcessedLogoResult } from "../utils/logoImagePipeline";
import { BANNER_PRESETS, type BannerPreset } from "../utils/bannerPresets";
import { communitiesService } from "../services";
import type { SubjectForum } from "../services/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CommunityImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forum: SubjectForum;
  defaultTab?: "banner" | "logo";
  isMock: boolean;
  onSaved: (updatedForum: SubjectForum) => void;
}

export const CommunityImageEditDialog: React.FC<CommunityImageEditDialogProps> = ({
  open,
  onOpenChange,
  forum,
  defaultTab = "banner",
  isMock,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<"banner" | "logo">(defaultTab);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessingBanner, setIsProcessingBanner] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New processed images ready to save
  const [processedBanner, setProcessedBanner] = useState<ProcessedImageResult | null>(null);
  const [processedLogo, setProcessedLogo] = useState<ProcessedLogoResult | null>(null);

  // Mark if user explicitly requested removal
  const [removeBanner, setRemoveBanner] = useState(false);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Reset local state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setProcessedBanner(null);
      setProcessedLogo(null);
      setRemoveBanner(false);
      setRemoveLogo(false);
    }
    onOpenChange(newOpen);
  };

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingBanner(true);
    try {
      const result = await processCommunityImage(file, {
        maxDimension: 1500,
        maxSizeBytes: 1048576, // 1 MB
        initialQuality: 0.85,
      });
      setProcessedBanner(result);
      setRemoveBanner(false);
      toast.success(`Banner compressed to ${(result.sizeBytes / 1024).toFixed(1)} KB`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to process banner image.");
      setProcessedBanner(null);
    } finally {
      setIsProcessingBanner(false);
    }
  };

  const handleSelectPreset = async (preset: BannerPreset) => {
    try {
      const res = await fetch(preset.dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${preset.id}.svg`, { type: "image/svg+xml" });
      setProcessedBanner({
        dataUrl: preset.dataUrl,
        file,
        originalName: `${preset.name}.svg`,
        sizeBytes: blob.size,
        width: 1200,
        height: 400,
      });
      setRemoveBanner(false);
      toast.success(`Selected "${preset.name}" minimal banner`);
    } catch {
      toast.error("Failed to select preset banner");
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingLogo(true);
    try {
      const result = await processLogoImage(file);
      setProcessedLogo(result);
      setRemoveLogo(false);
      toast.success(`Logo compressed to ${result.sizeKb} (256×256)`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to process logo image.");
      setProcessedLogo(null);
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalBannerUrl: string | null | undefined = undefined;
      let finalLogoUrl: string | null | undefined = undefined;

      if (removeBanner) {
        finalBannerUrl = null;
      } else if (processedBanner) {
        if (isMock) {
          finalBannerUrl = processedBanner.dataUrl;
        } else {
          const isSvg = processedBanner.file.type === "image/svg+xml";
          const ext = isSvg ? "svg" : "webp";
          const contentType = isSvg ? "image/svg+xml" : "image/webp";
          const filePath = `${forum.id}/banner.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("community-images")
            .upload(filePath, processedBanner.file, {
              upsert: true,
              contentType,
              cacheControl: "3600",
            });
          if (uploadError) throw new Error(uploadError.message);
          const { data: urlData } = supabase.storage.from("community-images").getPublicUrl(filePath);
          finalBannerUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      if (removeLogo) {
        finalLogoUrl = null;
      } else if (processedLogo) {
        if (isMock) {
          finalLogoUrl = processedLogo.previewUrl;
        } else {
          const filePath = `${forum.id}/logo.webp`;
          const { error: uploadError } = await supabase.storage
            .from("community-images")
            .upload(filePath, processedLogo.file, {
              upsert: true,
              contentType: "image/webp",
              cacheControl: "3600",
            });
          if (uploadError) throw new Error(uploadError.message);
          const { data: urlData } = supabase.storage.from("community-images").getPublicUrl(filePath);
          finalLogoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      const patch: { bannerUrl?: string | null; logoUrl?: string | null } = {};
      if (finalBannerUrl !== undefined) patch.bannerUrl = finalBannerUrl;
      if (finalLogoUrl !== undefined) patch.logoUrl = finalLogoUrl;

      if (Object.keys(patch).length === 0) {
        handleOpenChange(false);
        return;
      }

      if (!communitiesService.updateSubjectImages) {
        throw new Error("Update community images service method not available");
      }

      const res = await communitiesService.updateSubjectImages(forum.id, patch);
      if (res.error || !res.data) {
        throw new Error(res.error?.message || "Failed to update community images");
      }

      toast.success("Community visuals updated successfully!");
      onSaved(res.data);
      handleOpenChange(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Error saving images");
    } finally {
      setIsSaving(false);
    }
  };

  const currentBanner = removeBanner
    ? null
    : processedBanner
    ? processedBanner.dataUrl
    : forum.bannerUrl;

  const currentLogo = removeLogo
    ? null
    : processedLogo
    ? processedLogo.previewUrl
    : forum.logoUrl;

  const hasChanges =
    Boolean(processedBanner) ||
    Boolean(processedLogo) ||
    removeBanner ||
    removeLogo;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Community Images</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Customize the header banner and logo for {forum.name} ({forum.code}).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "banner" | "logo")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="banner" className="text-xs font-semibold gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Banner Cover
            </TabsTrigger>
            <TabsTrigger value="logo" className="text-xs font-semibold gap-1.5">
              <Network className="h-3.5 w-3.5" />
              Community Logo
            </TabsTrigger>
          </TabsList>

          {/* Banner Tab */}
          <TabsContent value="banner" className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">Banner Preview</span>
              <div className="relative w-full h-28 rounded-xl border overflow-hidden bg-muted/40 flex items-center justify-center">
                {currentBanner ? (
                  <img
                    src={currentBanner}
                    alt="Banner preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center select-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#0a0f1d] to-[#090d16]" />
                    <svg
                      className="absolute inset-0 w-full h-full opacity-60"
                      xmlns="http://www.w3.org/2000/svg"
                      width="100%"
                      height="100%"
                    >
                      <pattern id="dialog-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                      </pattern>
                      <rect width="100%" height="100%" fill="url(#dialog-grid)" />
                    </svg>
                    <span className="relative z-10 text-[11px] text-muted-foreground font-medium">
                      Default Minimal Banner
                    </span>
                  </div>
                )}
              </div>
            </div>

            <input
              type="file"
              ref={bannerFileInputRef}
              onChange={handleBannerFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex gap-2">
              <div
                onClick={() => bannerFileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-colors text-center"
              >
                {isProcessingBanner ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs font-medium">Processing banner...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Upload New Banner</p>
                    <p className="text-[10px] text-muted-foreground">
                      Max 1500px width, WebP compressed &lt; 1 MB.
                    </p>
                  </>
                )}
              </div>

              {(currentBanner || forum.bannerUrl) && !removeBanner && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessedBanner(null);
                    setRemoveBanner(true);
                  }}
                  className="h-auto px-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                  title="Reset to default banner"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {processedBanner && (
              <div className="rounded-md border bg-muted/30 p-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Ready to apply
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {(processedBanner.sizeBytes / 1024).toFixed(1)} KB WebP
                </Badge>
              </div>
            )}

            {/* Curated Minimal Banner Presets */}
            <div className="space-y-2 pt-1 border-t border-border/50">
              <span className="text-xs font-semibold text-foreground">Or Choose a Minimal Preset</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BANNER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="group relative h-14 rounded-lg border border-border/80 hover:border-primary/60 overflow-hidden text-left transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs"
                    title={preset.description}
                  >
                    <img
                      src={preset.dataUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-semibold text-white drop-shadow-xs truncate">
                        {preset.name}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Logo Tab */}
          <TabsContent value="logo" className="space-y-4">
            <div className="space-y-2">
              <span className="text-xs font-medium text-foreground">Logo Preview</span>
              <div className="flex items-center gap-4 p-3 rounded-xl border bg-muted/20">
                <div className="h-16 w-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center shrink-0 overflow-hidden text-primary">
                  {currentLogo ? (
                    <img
                      src={currentLogo}
                      alt="Logo preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Network className="h-8 w-8 stroke-[1.5]" />
                  )}
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-foreground">{forum.name}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {currentLogo ? "Custom logo active" : "Default system icon"}
                  </p>
                </div>
              </div>
            </div>

            <input
              type="file"
              ref={logoFileInputRef}
              onChange={handleLogoFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex gap-2">
              <div
                onClick={() => logoFileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/60 hover:bg-muted/40 transition-colors text-center"
              >
                {isProcessingLogo ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs font-medium">Processing logo...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Upload New Logo</p>
                    <p className="text-[10px] text-muted-foreground">
                      256×256 center-cropped, WebP compressed &lt; 100 KB.
                    </p>
                  </>
                )}
              </div>

              {(currentLogo || forum.logoUrl) && !removeLogo && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProcessedLogo(null);
                    setRemoveLogo(true);
                  }}
                  className="h-auto px-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                  title="Reset to default icon"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {processedLogo && (
              <div className="rounded-md border bg-muted/30 p-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Ready to apply
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  {processedLogo.sizeKb} WebP
                </Badge>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isProcessingBanner || isProcessingLogo}
            className="cursor-pointer"
          >
            {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
