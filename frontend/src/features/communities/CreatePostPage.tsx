/**
 * @file CreatePostPage.tsx
 * @description Dedicated Reddit-style full page view for composing and publishing a post.
 * @owner Communities Team
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RichContentEditor } from "./components/RichContentEditor";
import { communitiesService } from "./services";
import { processCommunityImage } from "./utils/imagePipeline";
import { toast } from "sonner";
import type { SubjectForum } from "./services/types";

export default function CreatePostPage() {
  const { subjectId } = useParams<{ subjectId?: string }>();
  const navigate = useNavigate();

  const [forums, setForums] = useState<SubjectForum[]>([]);
  const [selectedForum, setSelectedForum] = useState<SubjectForum | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageSizes, setImageSizes] = useState<number[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isAddingImage, setIsAddingImage] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Subject Forums
  useEffect(() => {
    let isMounted = true;
    communitiesService.getSubjectForums().then((res) => {
      if (isMounted && res.data) {
        setForums(res.data);
        const current =
          res.data.find((f) => f.id === subjectId) || res.data[0] || null;
        setSelectedForum(current);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [subjectId]);

  // Handle adding image URL
  const handleAddImage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!imageUrlInput.trim() || images.length >= 5) return;
    setImages((prev) => [...prev, imageUrlInput.trim()]);
    setImageSizes((prev) => [...prev, 0]);
    setImageUrlInput("");
    setIsAddingImage(false);
  };

  // Handle local file upload with WebP conversion, 1600px bounding, and 1MB ceiling check
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      toast.error("Maximum 5 images allowed per post.");
      e.target.value = "";
      return;
    }

    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    setIsProcessingImages(true);

    try {
      for (const file of filesToAdd) {
        try {
          const processed = await processCommunityImage(file, {
            maxDimension: 1600,
            maxSizeBytes: 1024 * 1024, // 1 MB strict ceiling
            initialQuality: 0.85,
          });

          setImages((prev) => [...prev, processed.dataUrl]);
          setImageSizes((prev) => [...prev, processed.sizeBytes]);
          toast.success(
            `"${file.name}" compressed to WebP (${Math.round(processed.sizeBytes / 1024)} KB)`
          );
        } catch (err: unknown) {
          toast.error((err as Error).message || `Failed to process "${file.name}".`);
        }
      }
    } finally {
      setIsProcessingImages(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageSizes((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Publish Post
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForum || isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Please enter a title for your post.");
      return;
    }
    if (trimmedTitle.length > 300) {
      toast.error("Title cannot exceed 300 characters.");
      return;
    }
    if (body.length > 2000) {
      toast.error("Body cannot exceed 2000 characters.");
      return;
    }
    if (images.length > 5) {
      toast.error("Maximum 5 images allowed per post.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await communitiesService.createPost({
        subjectId: selectedForum.id,
        title: trimmedTitle,
        body: body.trim(),
        images: images,
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create post.");
        return;
      }

      toast.success("Post published!");
      if (res.data) {
        navigate(`/communities/${selectedForum.id}/post/${res.data.id}`);
      } else {
        navigate(`/communities/${selectedForum.id}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const backUrl = selectedForum ? `/communities/${selectedForum.id}` : "/communities";

  return (
    <div className="min-h-full py-4 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {/* Header Bar with Single Circular Back Button + Forum Selector */}
        <div className="flex items-center justify-between text-xs pb-1">
          <div className="flex items-center gap-2">
            {/* Single circular back button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(backUrl)}
              className="-ml-2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Cancel and return"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Forum Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 px-2.5 text-xs font-semibold rounded-full border-border/80"
                >
                  <Avatar className="h-5 w-5 rounded-full border shrink-0">
                    {selectedForum?.imageUrl && (
                      <AvatarImage src={selectedForum.imageUrl} alt={selectedForum.name} className="object-cover" />
                    )}
                    <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                      {(selectedForum?.code || "CH").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[200px]">
                    {selectedForum ? `${selectedForum.code} • ${selectedForum.name}` : "Choose a community"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-h-64 overflow-y-auto">
                {forums.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => setSelectedForum(f)}
                    className="flex items-center justify-between text-xs gap-2 py-1.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5 rounded-full border shrink-0">
                        {f.imageUrl && <AvatarImage src={f.imageUrl} alt={f.name} className="object-cover" />}
                        <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                          {f.code.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <span className="font-semibold text-foreground">{f.code}</span>
                        <span className="text-muted-foreground ml-1.5">{f.name}</span>
                      </div>
                    </div>
                    {selectedForum?.id === f.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Create Post Form (Directly on canvas - NO CARD BORDER) */}
        <form onSubmit={handlePublish} className="space-y-4 pt-1">
          {/* Title* Input (Required) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Title<span className="text-destructive">*</span>
              </label>
              <span className="text-[11px] text-muted-foreground font-mono">
                {title.length}/300
              </span>
            </div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title*"
              required
              maxLength={300}
              className="text-base font-semibold h-11 bg-card/50"
              autoFocus
            />
          </div>

          {/* Images Section (Up to 5 images like Reddit) */}
          <div className="space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/15 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <ImageIcon className="h-4 w-4 text-primary" />
                <span>Images (optional, up to 5)</span>
              </div>
              <span className="text-muted-foreground font-mono text-[11px]">
                {images.length}/5
              </span>
            </div>

            {/* Thumbnail preview strip */}
            {images.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto py-1">
                {images.map((img, idx) => {
                  const sizeKb = imageSizes[idx] ? Math.round(imageSizes[idx] / 1024) : null;
                  return (
                    <div
                      key={idx}
                      className="relative group h-22 w-28 shrink-0 rounded-lg overflow-hidden border bg-black flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={img}
                        alt={`Upload ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        aria-label="Remove image"
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between pointer-events-none">
                        <span className="rounded bg-black/75 px-1 py-0.2 text-[9px] font-mono text-white">
                          #{idx + 1}
                        </span>
                        <span className="rounded bg-emerald-600/90 text-[9px] font-medium text-white px-1 py-0.2">
                          {sizeKb ? `${sizeKb}KB • WebP` : "WebP"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload controls & Processing state */}
            {isProcessingImages ? (
              <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Optimizing image to WebP (aspect ratio bounded, ≤1MB)...</span>
              </div>
            ) : (
              images.length < 5 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isProcessingImages}
                      className="hidden"
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors shadow-2xs">
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upload images (WebP)</span>
                    </span>
                  </label>

                  {!isAddingImage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingImage(true)}
                      className="h-8 text-xs text-muted-foreground"
                    >
                      Or add Image URL
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full sm:w-auto">
                      <Input
                        type="url"
                        placeholder="https://..."
                        value={imageUrlInput}
                        onChange={(e) => setImageUrlInput(e.target.value)}
                        className="h-8 text-xs w-56"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddImage();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddImage()}
                        disabled={!imageUrlInput.trim()}
                        className="h-8 text-xs px-2.5"
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingImage(false);
                          setImageUrlInput("");
                        }}
                        className="h-8 text-xs px-2"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Body Text (Optional) with Rich Formatting Editor */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">
              Body text (optional)
            </label>
            <RichContentEditor
              value={body}
              onChange={setBody}
              placeholder="Body text (optional)"
              compact={false}
              minHeight="min-h-[160px]"
            />
          </div>

          {/* Bottom Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(backUrl)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || isSubmitting}
              className="px-5 text-xs font-semibold shadow-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>Post</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
