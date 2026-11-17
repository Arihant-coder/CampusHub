/**
 * @file ImageCarousel.tsx
 * @description Reddit-style image carousel supporting up to 5 images with smooth horizontal sliding and navigation controls.
 * @owner Communities Team
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Loader2 } from "lucide-react";
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
  aspectClass = "max-h-[240px] sm:max-h-[260px] min-h-[140px]",
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedIndices, setLoadedIndices] = useState<Record<number, boolean>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const animatingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openImageViewer } = useImageViewer();

  // Touch swipe state
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  // Stabilize the images array so effects don't fire on every render
  const validImages = useMemo(
    () => (images || []).filter((img) => Boolean(img && img.trim())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images?.join(",")]
  );
  const total = validImages.length;

  // Background preload all carousel images so slide transitions feel instantaneous
  useEffect(() => {
    if (validImages.length === 0) return;
    validImages.forEach((src, idx) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setLoadedIndices((prev) => ({ ...prev, [idx]: true }));
      };
      img.onerror = () => {
        setLoadedIndices((prev) => ({ ...prev, [idx]: true }));
      };
    });
  }, [validImages]);

  // Clear the animating timer on unmount to avoid state updates on unmounted component
  useEffect(() => {
    return () => {
      if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    };
  }, []);

  // Clamp current index if image list changes
  useEffect(() => {
    if (total === 0) return;
    if (currentIndex >= total) {
      setCurrentIndex(Math.max(0, total - 1));
    }
  }, [total, currentIndex]);

  if (total === 0) return null;

  // Slide helper: briefly marks element as will-change only during the 300ms
  // transition so the GPU layer is promoted only when needed.
  const slideTo = (nextIndex: number) => {
    setIsAnimating(true);
    setCurrentIndex(nextIndex);
    if (animatingTimerRef.current) clearTimeout(animatingTimerRef.current);
    animatingTimerRef.current = setTimeout(() => setIsAnimating(false), 320);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    slideTo(currentIndex === 0 ? total - 1 : currentIndex - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    slideTo(currentIndex === total - 1 ? 0 : currentIndex + 1);
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    slideTo(index);
  };

  const handleImageClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    openImageViewer({
      images: validImages,
      initialIndex: index,
      title,
    });
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndXRef.current = null;
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const distance = touchStartXRef.current - touchEndXRef.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      // Swiped left -> Next image
      slideTo(currentIndex === total - 1 ? 0 : currentIndex + 1);
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> Previous image
      slideTo(currentIndex === 0 ? total - 1 : currentIndex - 1);
    }

    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  return (
    <div
      className={`group relative w-full h-[220px] sm:h-[300px] md:h-[360px] overflow-hidden rounded-xl border border-border/80 bg-neutral-900/90 dark:bg-black/90 select-none ${aspectClass} ${className}`}
      tabIndex={0}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          slideTo(currentIndex === 0 ? total - 1 : currentIndex - 1);
        } else if (e.key === "ArrowRight") {
          slideTo(currentIndex === total - 1 ? 0 : currentIndex + 1);
        }
      }}
    >
      {/* Sliding Carousel Track */}
      <div
        className={`flex w-full h-full transition-transform duration-300 ease-out motion-reduce:transition-none ${isAnimating ? "will-change-transform" : ""}`}
        style={{
          transform: `translateX(-${currentIndex * 100}%)`,
        }}
      >
        {validImages.map((src, idx) => (
          <div
            key={idx}
            className="relative min-w-full w-full h-full flex items-center justify-center shrink-0 overflow-hidden p-1"
          >
            {/* Loading placeholder spinner if image is fetching */}
            {!loadedIndices[idx] && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-900/70 text-white/50 pointer-events-none z-0">
                <Loader2 className="h-6 w-6 animate-spin text-white/70" />
                <span className="text-[11px] font-medium tracking-wide">Loading image...</span>
              </div>
            )}

            <img
              src={src}
              alt={`${title} - view ${idx + 1} of ${total}`}
              onClick={(e) => handleImageClick(idx, e)}
              onLoad={() => {
                setLoadedIndices((prev) => ({ ...prev, [idx]: true }));
              }}
              onError={() => {
                setLoadedIndices((prev) => ({ ...prev, [idx]: true }));
              }}
              className={`max-h-full max-w-full object-contain cursor-zoom-in transition-opacity duration-300 hover:opacity-95 ${
                loadedIndices[idx] ? "opacity-100" : "opacity-0"
              }`}
              loading={idx === 0 ? "eager" : "lazy"}
              decoding="async"
              {...(idx === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
              title="Click to expand full screen"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Expand Fullscreen Button */}
      <button
        type="button"
        onClick={(e) => handleImageClick(currentIndex, e)}
        className="absolute top-3 left-3 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/90 transition-all border border-white/15 backdrop-blur-xs z-10"
        title="Expand image"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Counter Badge (Reddit-style "1/3") */}
      {total > 1 && (
        <div className="absolute top-3 right-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md border border-white/10 z-10 pointer-events-none">
          {currentIndex + 1}/{total}
        </div>
      )}

      {/* Navigation Chevrons (shown only if more than 1 image) */}
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
