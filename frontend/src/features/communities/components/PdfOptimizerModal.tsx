/**
 * @file PdfOptimizerModal.tsx
 * @description Customizable local PDF viewer & compression studio modal.
 *              Allows previewing PDF pages in real-time, selecting standard presets or
 *              freely adjusting continuous quality/resolution sliders to any custom value in between.
 *              Includes side-by-side legibility comparison, zoom/pan controls, and quota impact verification.
 * @owner Communities Team
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Split,
  Eye,
  Check,
} from "lucide-react";
import {
  COMPRESSION_PRESETS,
  DEFAULT_MAX_DIMENSION,
  DEFAULT_QUALITY,
  getPdfDocument,
  renderPagePreviewDataUrl,
  compressPdf,
  type CompressionProgress,
  type CompressionOptions,
} from "../utils/pdfCompressor";

interface PdfOptimizerModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onApply: (compressedFile: File, stats: { originalSize: number; compressedSize: number }) => void;
}

type ViewMode = "split" | "single";
type ActivePreviewTab = "compressed" | "original";

export function PdfOptimizerModal({
  isOpen,
  file,
  onClose,
  onApply,
}: PdfOptimizerModalProps) {
  // Document state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingDoc, setIsLoadingDoc] = useState<boolean>(false);
  const [docLoadError, setDocLoadError] = useState<string | null>(null);

  // Compression configuration (presets + free continuous sliders)
  const [activePresetId, setActivePresetId] = useState<string>("balanced");
  const [quality, setQuality] = useState<number>(DEFAULT_QUALITY);
  const [maxDimension, setMaxDimension] = useState<number>(DEFAULT_MAX_DIMENSION);
  const [grayscale, setGrayscale] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Live preview state
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState<string | null>(null);
  const [compressedPreviewUrl, setCompressedPreviewUrl] = useState<string | null>(null);
  const [pageByteEstimate, setPageByteEstimate] = useState<number>(0);
  const [isRenderingPreview, setIsRenderingPreview] = useState<boolean>(false);

  // Viewer controls
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [singleTab, setSingleTab] = useState<ActivePreviewTab>("compressed");
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Compression processing
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load PDF Document when modal opens with a file
  useEffect(() => {
    if (!isOpen || !file) {
      setPdfDoc(null);
      setOriginalPreviewUrl(null);
      setCompressedPreviewUrl(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDoc(true);
    setDocLoadError(null);
    setCurrentPage(1);

    getPdfDocument(file)
      .then(({ pdfDoc: loadedDoc, numPages: totalPages }) => {
        if (!isMounted) return;
        setPdfDoc(loadedDoc);
        setNumPages(totalPages);
        setIsLoadingDoc(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load PDF locally:", err);
        setDocLoadError(err.message || "Failed to parse PDF document.");
        setIsLoadingDoc(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, file]);

  // 2. Render Page Previews (Original & Compressed)
  const renderPreviews = useCallback(
    async (pageNumber: number, options: CompressionOptions) => {
      if (!pdfDoc) return;
      setIsRenderingPreview(true);

      try {
        // Original page rendering (uncompressed preview)
        const origResult = await renderPagePreviewDataUrl(pdfDoc, pageNumber, {
          maxDimension: 2048,
          quality: 0.95,
          grayscale: false,
        });
        setOriginalPreviewUrl(origResult.dataUrl);

        // Compressed page rendering (with current custom settings)
        const compResult = await renderPagePreviewDataUrl(pdfDoc, pageNumber, options);
        setCompressedPreviewUrl(compResult.dataUrl);
        setPageByteEstimate(compResult.byteEstimate);
      } catch (err) {
        console.error("Preview rendering error:", err);
      } finally {
        setIsRenderingPreview(false);
      }
    },
    [pdfDoc]
  );

  // Trigger preview update when page or compression options change (with debounce)
  useEffect(() => {
    if (!pdfDoc) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      renderPreviews(currentPage, { quality, maxDimension, grayscale });
    }, 120);

    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [pdfDoc, currentPage, quality, maxDimension, grayscale, renderPreviews]);

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    const preset = COMPRESSION_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setQuality(preset.quality);
    setMaxDimension(preset.maxDimension);
    setGrayscale(preset.grayscale);
  };

  // Handle Free Slider Changes (Custom adjustment to any value in between)
  const handleQualityChange = (val: number) => {
    setActivePresetId("custom");
    setQuality(val);
  };

  const handleMaxDimensionChange = (val: number) => {
    setActivePresetId("custom");
    setMaxDimension(val);
  };

  const handleGrayscaleToggle = (checked: boolean) => {
    setActivePresetId("custom");
    setGrayscale(checked);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomScale(1);

  // Page navigation
  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(numPages, p + 1));

  // Estimated full document size based on single page render sample
  const estimatedTotalBytes = Math.max(
    1024,
    Math.round(pageByteEstimate * numPages * 1.05)
  );
  const originalBytes = file?.size || 0;
  const estimatedSavingsPercent = Math.max(
    0,
    Math.min(95, Math.round(((originalBytes - estimatedTotalBytes) / originalBytes) * 100))
  );

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  // Execute full client-side compression
  const handleApply = async () => {
    if (!file || isCompressing) return;

    try {
      setIsCompressing(true);
      setCompressionProgress({ percent: 0, step: "Starting compression..." });

      const result = await compressPdf(
        file,
        { quality, maxDimension, grayscale },
        (progress) => setCompressionProgress(progress)
      );

      onApply(result.file, {
        originalSize: result.originalBytes,
        compressedSize: result.compressedBytes,
      });
      onClose();
    } catch (err: any) {
      console.error("Compression execution failed:", err);
    } finally {
      setIsCompressing(false);
      setCompressionProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isCompressing && onClose()}>
      <DialogContent className="max-w-5xl! w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-background border shadow-2xl">
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b shrink-0 flex flex-row items-center justify-between space-y-0 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold flex items-center gap-2">
                <span>PDF Compression Studio & Preview</span>
                {file && (
                  <Badge variant="outline" className="text-[11px] font-normal px-2 py-0">
                    {formatSize(originalBytes)}
                  </Badge>
                )}
                {numPages > 0 && (
                  <Badge variant="secondary" className="text-[11px] font-normal px-2 py-0">
                    {numPages} {numPages === 1 ? "page" : "pages"}
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground truncate max-w-md">
                {file?.name || "Document"}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Studio Body: Top Controls & Viewer */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Controls Bar: Presets & Continuous Sliders */}
          <div className="px-5 py-2.5 border-b bg-card/60 space-y-2 shrink-0">
            {/* Row 1: Presets + Quick toggles */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                  Preset:
                </span>
                {COMPRESSION_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
                      }`}
                      title={preset.description}
                    >
                      {preset.shortLabel}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                    activePresetId === "custom" || showAdvanced
                      ? "bg-secondary text-foreground border-primary/50"
                      : "bg-background text-muted-foreground hover:text-foreground border-border"
                  }`}
                >
                  <Sliders className="h-3 w-3" />
                  <span>Custom Sliders</span>
                </button>
              </div>

              {/* Size metrics & Quota badge */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 bg-muted/50 border px-2.5 py-1 rounded-md">
                  <span className="text-muted-foreground text-[11px]">Est. Size:</span>
                  <span className="font-semibold text-foreground">
                    ~{formatSize(estimatedTotalBytes)}
                  </span>
                  {estimatedSavingsPercent > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1 rounded">
                      -{estimatedSavingsPercent}%
                    </span>
                  )}
                </div>

                {estimatedTotalBytes <= 5 * 1024 * 1024 ? (
                  <Badge variant="outline" className="text-[11px] text-emerald-600 border-emerald-500/30 gap-1 bg-emerald-500/5">
                    <CheckCircle2 className="h-3 w-3" />
                    Fits &lt; 5 MB
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[11px] gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Exceeds 5 MB
                  </Badge>
                )}
              </div>
            </div>

            {/* Row 2: Sliders (Quality, Max Dimension, Grayscale) */}
            <div className="pt-1.5 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Quality Slider (10% to 100%) */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Quality</span>
                  <span className="font-semibold text-foreground">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.15"
                  max="0.95"
                  step="0.01"
                  value={quality}
                  onChange={(e) => handleQualityChange(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Max Resolution / Dimension Slider (800px to 2200px) */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Max Resolution</span>
                  <span className="font-semibold text-foreground">{maxDimension}px</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="2200"
                  step="50"
                  value={maxDimension}
                  onChange={(e) => handleMaxDimensionChange(parseInt(e.target.value, 10))}
                  className="w-full accent-primary h-1.5 bg-secondary rounded-lg cursor-pointer"
                />
              </div>

              {/* Grayscale Toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-3 pt-2 sm:pt-0">
                <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={grayscale}
                    onChange={(e) => handleGrayscaleToggle(e.target.checked)}
                    className="accent-primary rounded h-3.5 w-3.5"
                  />
                  <span>Monochrome (B&W Extra Compression)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Viewer Toolbar: Navigation, Zoom & View Mode */}
          <div className="px-5 py-2 border-b bg-muted/10 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
            {/* Page Navigation */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage <= 1 || isCompressing}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-medium px-1 text-muted-foreground">
                Page <span className="text-foreground font-semibold">{currentPage}</span> of{" "}
                <span className="text-foreground font-semibold">{numPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage >= numPages || isCompressing}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* View Mode Toggle: Split vs Single */}
            <div className="flex items-center bg-secondary/80 rounded-md p-0.5 border">
              <button
                type="button"
                onClick={() => setViewMode("split")}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === "split"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Split className="h-3 w-3" />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-2 py-1 text-[11px] font-medium rounded flex items-center gap-1 cursor-pointer transition-all ${
                  viewMode === "single"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                <span>Single Toggle</span>
              </button>
            </div>

            {/* Single Mode Tab Selector (if in single view) */}
            {viewMode === "single" && (
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSingleTab("original")}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    singleTab === "original"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Original
                </button>
                <button
                  type="button"
                  onClick={() => setSingleTab("compressed")}
                  className={`px-2 py-1 rounded cursor-pointer ${
                    singleTab === "compressed"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Compressed
                </button>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomScale <= 0.5}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] font-mono text-muted-foreground w-11 text-center">
                {Math.round(zoomScale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3.0}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Reset Zoom (100%)"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Main Visual Preview Area */}
          <div className="flex-1 overflow-auto bg-neutral-900/90 dark:bg-black/95 p-4 flex items-center justify-center relative select-none">
            {isLoadingDoc ? (
              <div className="flex flex-col items-center justify-center gap-2 text-neutral-300">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs">Loading PDF document locally...</span>
              </div>
            ) : docLoadError ? (
              <div className="flex flex-col items-center justify-center gap-2 text-destructive max-w-sm text-center">
                <AlertTriangle className="h-8 w-8" />
                <span className="text-xs font-medium">{docLoadError}</span>
              </div>
            ) : (
              <div
                className="transition-transform duration-100 ease-out flex items-center justify-center"
                style={{ transform: `scale(${zoomScale})`, transformOrigin: "center center" }}
              >
                {viewMode === "split" ? (
                  <div className="flex flex-row items-start gap-4">
                    {/* Left: Original Page */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-neutral-800 text-neutral-300 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shadow">
                        Original (High Fidelity)
                      </div>
                      <div className="bg-white rounded-md shadow-2xl overflow-hidden border border-neutral-700 max-w-[420px] max-h-[580px] flex items-center justify-center">
                        {originalPreviewUrl ? (
                          <img
                            src={originalPreviewUrl}
                            alt={`Original Page ${currentPage}`}
                            className="max-w-full max-h-[580px] object-contain block"
                          />
                        ) : (
                          <div className="w-[380px] h-[520px] flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Compressed Page */}
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shadow flex items-center gap-1">
                        <span>Compressed Preview</span>
                        {isRenderingPreview && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                      </div>
                      <div className="bg-white rounded-md shadow-2xl overflow-hidden border border-neutral-700 max-w-[420px] max-h-[580px] flex items-center justify-center">
                        {compressedPreviewUrl ? (
                          <img
                            src={compressedPreviewUrl}
                            alt={`Compressed Page ${currentPage}`}
                            className="max-w-full max-h-[580px] object-contain block"
                          />
                        ) : (
                          <div className="w-[380px] h-[520px] flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Toggle View */
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="bg-neutral-800 text-neutral-200 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded shadow flex items-center gap-1">
                      <span>
                        {singleTab === "original" ? "Original Page" : "Compressed Preview"}
                      </span>
                      {isRenderingPreview && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                    </div>
                    <div className="bg-white rounded-md shadow-2xl overflow-hidden border border-neutral-700 max-w-[620px] max-h-[640px] flex items-center justify-center">
                      <img
                        src={
                          singleTab === "original"
                            ? originalPreviewUrl || ""
                            : compressedPreviewUrl || ""
                        }
                        alt={`Page ${currentPage}`}
                        className="max-w-full max-h-[640px] object-contain block"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Progress indicator & Actions */}
        <div className="px-5 py-3 border-t bg-card shrink-0 flex items-center justify-between gap-3">
          {/* Left: Compression progress */}
          <div className="flex-1 max-w-sm">
            {isCompressing && compressionProgress ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    {compressionProgress.step}
                  </span>
                  <span className="font-semibold text-primary">{compressionProgress.percent}%</span>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-200 rounded-full"
                    style={{ width: `${compressionProgress.percent}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                <span>All compression and rendering happen locally in your browser.</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isCompressing}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isCompressing || isLoadingDoc || !pdfDoc}
              className="text-xs h-8 gap-1.5 font-semibold"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Compressing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>
                    Apply Optimization (~{formatSize(estimatedTotalBytes)})
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

