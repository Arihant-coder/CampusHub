/**
 * @file pdfCompressor.ts
 * @description On-demand client-side PDF compression utility.
 *              Lazy-loads pdf-lib and pdfjs-dist from public CDN only when compression is requested,
 *              maintaining 0 KB impact on the initial application bundle.
 * @owner Communities Team
 */

const PDF_LIB_CDN = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";
const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDFJS_WORKER_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

export interface CompressionProgress {
  percent: number;
  step: string;
}

export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY = 0.75;

let cachedPdfLib: any = null;
let cachedPdfJs: any = null;

/**
 * Lazy loads pdf-lib and pdfjs-dist on-demand from CDN
 */
async function loadPdfTools(onProgress?: (progress: CompressionProgress) => void) {
  if (cachedPdfLib && cachedPdfJs) {
    return { PDFLib: cachedPdfLib, pdfjsLib: cachedPdfJs };
  }

  onProgress?.({ percent: 5, step: "Loading compression engine from CDN..." });

  const [pdfLibModule, pdfjsModule] = await Promise.all([
    /* @vite-ignore */ import(/* webpackIgnore: true */ PDF_LIB_CDN),
    /* @vite-ignore */ import(/* webpackIgnore: true */ PDFJS_CDN),
  ]);

  cachedPdfLib = pdfLibModule;
  cachedPdfJs = pdfjsModule;

  if (cachedPdfJs?.GlobalWorkerOptions) {
    cachedPdfJs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  }

  return { PDFLib: cachedPdfLib, pdfjsLib: cachedPdfJs };
}

/**
 * Compresses a PDF file in-memory within the browser.
 * Renders pages to bounded canvases (max 1600px), compresses images as JPEG (0.75 quality),
 * and reassembles with object streams.
 */
export async function compressPdf(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<{ file: File; originalBytes: number; compressedBytes: number; savedBytes: number }> {
  const maxDim = options.maxDimension || DEFAULT_MAX_DIMENSION;
  const quality = options.quality || DEFAULT_QUALITY;
  const originalBytes = file.size;

  onProgress?.({ percent: 10, step: "Initializing document..." });

  const { PDFLib, pdfjsLib } = await loadPdfTools(onProgress);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const srcPdf = await loadingTask.promise;
  const numPages = srcPdf.numPages;

  onProgress?.({ percent: 20, step: `Preparing ${numPages} page(s)...` });

  const targetPdf = await PDFLib.PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const pageProgress = Math.round(20 + ((i - 0.5) / numPages) * 70);
    onProgress?.({
      percent: pageProgress,
      step: `Optimizing page ${i} of ${numPages}...`,
    });

    const page = await srcPdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });

    // Calculate proportional resize bounding
    let { width, height } = viewport;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const scale = width / viewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Render to Canvas
    const canvas = document.createElement("canvas");
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas rendering context unavailable.");
    }

    await page.render({
      canvasContext: ctx,
      viewport: scaledViewport,
    }).promise;

    // Convert canvas to JPEG blob
    const imgDataUrl = canvas.toDataURL("image/jpeg", quality);
    const imgBytes = await fetch(imgDataUrl).then((res) => res.arrayBuffer());

    const embeddedImage = await targetPdf.embedJpg(imgBytes);
    const newPage = targetPdf.addPage([embeddedImage.width, embeddedImage.height]);
    newPage.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width: embeddedImage.width,
      height: embeddedImage.height,
    });
  }

  onProgress?.({ percent: 95, step: "Finalizing compressed PDF..." });

  // Save with internal object streams enabled
  const compressedUint8Array = await targetPdf.save({ useObjectStreams: true });
  const compressedBytes = compressedUint8Array.byteLength;

  onProgress?.({ percent: 100, step: "Compression complete!" });

  // If compressed result is smaller, return compressed File; otherwise keep original
  if (compressedBytes < originalBytes) {
    const compressedBlob = new Blob([compressedUint8Array], { type: "application/pdf" });
    const compressedFile = new File([compressedBlob], file.name, {
      type: "application/pdf",
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalBytes,
      compressedBytes,
      savedBytes: originalBytes - compressedBytes,
    };
  }

  return {
    file,
    originalBytes,
    compressedBytes: originalBytes,
    savedBytes: 0,
  };
}
