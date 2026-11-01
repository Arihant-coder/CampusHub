/**
 * @file image-viewer.tsx
 * @description Full-window lightbox image viewer with zoom, pan, gallery navigation, and keyboard controls.
 * @owner Platform Core Team
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
} from "lucide-react";

export interface ImageViewerModalProps {
  isOpen: boolean;
  images: string[];
  currentIndex: number;
  title?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function ImageViewerModal({
  isOpen,
  images,
  currentIndex,
  title,
  onClose,
  onIndexChange,
}: ImageViewerModalProps) {
  // Zoom & Pan state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isWheeling, setIsWheeling] = useState(false);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const panRef = useRef(pan);
  panRef.current = pan;
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPanRef = useRef({ x: 0, y: 0 });
  const didDragRef = useRef(false);

  // Reset zoom & pan when image changes or viewer opens
  const resetTransform = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetTransform();
    }
  }, [isOpen, currentIndex, resetTransform]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Non-passive wheel & gesture listener:
  // Intercepts pinch-to-zoom (WheelEvent with ctrlKey) and scrolling inside the viewer,
  // preventing Firefox / Chrome / Safari from zooming the browser window.
  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent browser default window zoom and background page scroll
      e.preventDefault();
      e.stopPropagation();

      // Temporarily disable CSS transition during active gestures for instantaneous 60fps tracking
      setIsWheeling(true);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      wheelTimeoutRef.current = setTimeout(() => {
        setIsWheeling(false);
      }, 120);

      if (e.ctrlKey) {
        // Touchpad pinch-to-zoom gesture or Ctrl + Mouse Wheel
        // Continuous smooth exponential scaling factor
        const zoomFactor = Math.exp(-e.deltaY * 0.005);
        setScale((prev) => {
          const next = Math.min(Math.max(Number((prev * zoomFactor).toFixed(3)), 0.5), 4);
          if (next <= 1) setPan({ x: 0, y: 0 });
          return next;
        });
      } else {
        // Standard scroll / swipe
        if (scaleRef.current > 1 && (e.deltaX !== 0 || Math.abs(e.deltaY) < 40)) {
          // Two-finger trackpad panning when zoomed in
          setPan((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
        } else {
          // Mouse wheel stepped notch zoom
          if (e.deltaY < 0) {
            setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4));
          } else if (e.deltaY > 0) {
            setScale((prev) => {
              const next = Math.max(Number((prev - 0.25).toFixed(2)), 0.5);
              if (next <= 1) setPan({ x: 0, y: 0 });
              return next;
            });
          }
        }
      }
    };

    // Prevent Safari gesture zoom
    const handleGesture = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("gesturestart", handleGesture, { passive: false });
    window.addEventListener("gesturechange", handleGesture, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("gesturestart", handleGesture);
      window.removeEventListener("gesturechange", handleGesture);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    resetTransform();
    onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  }, [images.length, currentIndex, onIndexChange, resetTransform]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    resetTransform();
    onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  }, [images.length, currentIndex, onIndexChange, resetTransform]);

  // Zoom handlers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 0.5);
      if (next <= 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleToggleZoom = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handlePrev, handleNext, onClose, resetTransform]);

  // Mouse drag panning (only active when zoomed in)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPanRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDragRef.current = true;
    }
    setPan({
      x: initialPanRef.current.x + dx,
      y: initialPanRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || "";
  const total = images.length;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none touch-none animate-in fade-in duration-200"
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 text-white backdrop-blur-sm">
        {/* Title or Counter */}
        <div className="flex items-center gap-3 min-w-0 max-w-[50%]">
          {total > 1 && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold font-mono border border-white/15">
              {currentIndex + 1} / {total}
            </span>
          )}
          {title && (
            <span className="text-xs sm:text-sm font-medium text-white/90 truncate">
              {title}
            </span>
          )}
        </div>

        {/* Center / Right Controls: Zoom + Open Original + Close */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls capsule */}
          <div className="flex items-center rounded-lg bg-white/10 p-0.5 border border-white/15">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Zoom out (-)"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={resetTransform}
              className="px-2 py-0.5 text-[11px] font-mono font-semibold text-white/90 hover:bg-white/20 rounded transition-colors"
              title="Reset zoom (0)"
            >
              {Math.round(scale * 100)}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={scale >= 4}
              className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Zoom in (+)"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            {scale !== 1 && (
              <button
                type="button"
                onClick={resetTransform}
                className="p-1.5 rounded-md hover:bg-white/20 text-white/80 hover:text-white transition-colors border-l border-white/10 ml-0.5"
                title="Reset to 1:1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Open original link */}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/15 hidden sm:flex items-center justify-center"
            title="Open original file"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-destructive/80 text-white transition-colors border border-white/15 hover:border-destructive/80"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Stage (takes all the window) */}
      <main
        className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden p-2 sm:p-4 ${
          scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
        onClick={(e) => {
          // If click was on stage background (not dragging), close viewer
          if (e.target === e.currentTarget && !didDragRef.current) {
            onClose();
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <img
          src={currentImage}
          alt={title || `View ${currentIndex + 1} of ${total}`}
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            transition: isDragging || isWheeling ? "none" : "transform 150ms ease-out",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!didDragRef.current) {
              handleToggleZoom();
            }
          }}
          className="max-h-[90vh] max-w-[94vw] object-contain select-none pointer-events-auto rounded-sm shadow-2xl touch-none"
          draggable={false}
        />

        {/* Navigation Chevrons (Floating left and right) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-xl z-20 border border-white/20 backdrop-blur-xs"
              aria-label="Previous image"
              title="Previous (ArrowLeft)"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 hover:scale-105 active:scale-95 transition-all shadow-xl z-20 border border-white/20 backdrop-blur-xs"
              aria-label="Next image"
              title="Next (ArrowRight)"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        {/* Thumbnail Dots Bar (if multiple images) */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/60 px-3 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  resetTransform();
                  onIndexChange(idx);
                }}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? "h-2 w-6 bg-white"
                    : "h-2 w-2 bg-white/40 hover:bg-white/70"
                }`}
                title={`Image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </main>
    </div>,
    document.body
  );
}
