/**
 * @file logoImagePipeline.ts
 * @description Client-side logo/icon image optimization pipeline: 256x256 center-crop, WebP conversion, and 100KB ceiling.
 * @owner Communities Team
 */

export interface ProcessedLogoResult {
  file: File;
  previewUrl: string;
  sizeBytes: number;
  sizeKb: string;
}

const TARGET_DIMENSION = 256;
const MAX_ALLOWED_BYTES = 102400; // 100 KB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * Center-crops any image to a 1:1 square, scales it to 256x256 px,
 * and adaptively compresses it to WebP ensuring size is under 100 KB.
 */
export async function processLogoImage(file: File): Promise<ProcessedLogoResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`File "${file.name}" is not a supported image.`);
  }

  const objectUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Failed to load selected image."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  const cropSize = Math.min(naturalWidth, naturalHeight);
  const sx = Math.floor((naturalWidth - cropSize) / 2);
  const sy = Math.floor((naturalHeight - cropSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_DIMENSION;
  canvas.height = TARGET_DIMENSION;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context for image processing.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, TARGET_DIMENSION, TARGET_DIMENSION);

  const toWebpBlob = (quality: number): Promise<Blob> =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to generate WebP image blob."));
        },
        "image/webp",
        quality
      );
    });

  let quality = 0.90;
  let blob = await toWebpBlob(quality);

  while (blob.size > MAX_ALLOWED_BYTES && quality > 0.40) {
    quality = Math.max(0.40, parseFloat((quality - 0.08).toFixed(2)));
    blob = await toWebpBlob(quality);
  }

  if (blob.size > MAX_ALLOWED_BYTES) {
    throw new Error(`Image is too complex to fit within the 100 KB limit (${formatBytes(blob.size)}).`);
  }

  const previewUrl = canvas.toDataURL("image/webp", quality);
  const processedFile = new File([blob], "logo.webp", { type: "image/webp" });

  return {
    file: processedFile,
    previewUrl,
    sizeBytes: blob.size,
    sizeKb: formatBytes(blob.size),
  };
}
