/**
 * @file ImageCarousel.tsx
 * @description Reddit-style image carousel supporting up to 5 images with navigation controls.
 * @owner Communities Team
 */

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { useImageViewer } from "@/lib/image-viewer-context";

interface ImageCarouselProps {
  images: string[];
  title?: string;
  className?: string;
  aspectClass?: string;
}

export function ImageCarousel({
  images,
  title = "Post image",
  className = "",
  aspectClass = "max-h-[380px] sm:max-h-[440px] min-h-[180px] sm:min-h-[220px]",
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { openImageViewer } = useImageViewer();

  if (!images || images.length === 0) return null;

  const validImages = images.filter((img) => Boolean(img && img.trim()));
  if (validImages.length === 0) return null;

  const total = validImages.length;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(index);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openImageViewer({
      images: validImages,
      initialIndex: currentIndex,
      title,
    });
  };

  return (
    <div
      className={`group relative w-full overflow-hidden rounded-xl border border-border/80 bg-black/95 flex items-center justify-center select-none ${aspectClass} ${className}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          setCurrentIndex((prev) => (prev === 0 ? total - 1 : prev - 1));
        } else if (e.key === "ArrowRight") {
          setCurrentIndex((prev) => (prev === total - 1 ? 0 : prev + 1));
        }
      }}
    >
      {/* Current Image */}
      <img
        src={validImages[currentIndex]}
        alt={`${title} - view ${currentIndex + 1} of ${total}`}
        onClick={handleImageClick}
        className="max-h-full max-w-full object-contain cursor-zoom-in transition-opacity duration-200 hover:opacity-95"
        loading="lazy"
        title="Click to expand full screen"
      />

      {/* Expand Fullscreen Button */}
      <button
        type="button"
        onClick={handleImageClick}
        className="absolute top-3 left-3 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/90 transition-all border border-white/15 backdrop-blur-xs z-10"
        title="Expand image"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Counter Badge (Reddit-style "1/3") */}
      {total > 1 && (
        <div className="absolute top-3 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10 z-10">
          {currentIndex + 1}/{total}
        </div>
      )}

      {/* Navigation Buttons (shown only if more than 1 image) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-md z-10 border border-white/15"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-md z-10 border border-white/15"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots Indicator */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleDotClick(idx, e)}
                aria-label={`Go to image ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
