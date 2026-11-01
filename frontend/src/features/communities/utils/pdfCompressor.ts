/**
 * @file pdfCompressor.ts
 * @description On-demand client-side PDF compression and preview utility.
 *              Lazy-loads pdf-lib and pdfjs-dist from public CDN only when requested,
 *              maintaining 0 KB impact on the initial application bundle.
 *              Everything executes locally in the browser with no external data transmission.
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
  grayscale?: boolean;
}

export interface CompressionPreset {
  id: string;
  name: string;
  shortLabel: string;
  description: string;
  maxDimension: number;
  quality: number;
  grayscale: boolean;
}

export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    id: "low",
    name: "Low Compression (Sharp)",
    shortLabel: "Low",
    description: "Highest visual clarity (1920px, 85% quality). Ideal for complex math and fine diagrams.",
    maxDimension: 1920,
    quality: 0.85,
    grayscale: false,
  },
  {
    id: "balanced",
    name: "Balanced (Recommended)",
    shortLabel: "Balanced",
    description: "Recommended (1400px, 70% quality). Crisp legibility with ~50-70% file size reduction.",
    maxDimension: 1400,
    quality: 0.70,
    grayscale: false,
  },
  {
    id: "high",
    name: "High Compression",
    shortLabel: "High",
    description: "Strong compression (1080px, 52% quality). ~75-85% size reduction, great for 5 MB limit.",
    maxDimension: 1080,
    quality: 0.52,
    grayscale: false,
  },
  {
    id: "extreme",
    name: "Extreme (B&W Notes)",
    shortLabel: "Extreme",
    description: "Maximum space savings (900px, 40% quality, Grayscale). Best for scans and monochrome notes.",
    maxDimension: 900,
    quality: 0.40,
    grayscale: true,
  },
];

export const DEFAULT_MAX_DIMENSION = 1400;
export const DEFAULT_QUALITY = 0.70;

let cachedPdfLib: any = null;
let cachedPdfJs: any = null;

/**
 * Lazy loads pdf-lib and pdfjs-dist on-demand from CDN
 */
export async function loadPdfTools(onProgress?: (progress: CompressionProgress) => void) {
  if (cachedPdfLib && cachedPdfJs) {
    return { PDFLib: cachedPdfLib, pdfjsLib: cachedPdfJs };
  }

  onProgress?.({ percent: 5, step: "Loading local PDF engine..." });

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
 * Parse a PDF file and return the pdfjs document proxy and page count
 */
export async function getPdfDocument(file: File) {
  const { pdfjsLib } = await loadPdfTools();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  return {
    pdfDoc,
    numPages: pdfDoc.numPages as number,
  };
}

/**
 * Renders a specific PDF page to an HTML Canvas with optional scaling and grayscale
 */
export async function renderPdfPageToCanvas(
  page: any,
  canvas: HTMLCanvasElement,
  options: {
    maxDimension?: number;
    scaleMultiplier?: number;
    grayscale?: boolean;
  } = {}
) {
  const baseViewport = page.getViewport({ scale: 1.0 });
  const maxDim = options.maxDimension || 2048;

  let { width, height } = baseViewport;
  if (width > maxDim || height > maxDim) {
    if (width > height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }

  const scale = (width / baseViewport.width) * (options.scaleMultiplier || 1.0);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: Boolean(options.grayscale) });
  if (!ctx) throw new Error("Canvas rendering context unavailable.");

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  if (options.grayscale) {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = avg;
      d[i + 1] = avg;
      d[i + 2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

/**
 * Renders a page preview to a JPEG Data URL at the specified compression settings
 */
export async function renderPagePreviewDataUrl(
  pdfDoc: any,
  pageNumber: number,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; byteEstimate: number; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNumber);
  const canvas = document.createElement("canvas");

  await renderPdfPageToCanvas(page, canvas, {
    maxDimension: options.maxDimension || DEFAULT_MAX_DIMENSION,
    grayscale: options.grayscale,
  });

  const quality = Math.max(0.1, Math.min(1.0, options.quality ?? DEFAULT_QUALITY));
  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Approximate byte size of JPEG data URL
  const base64Length = dataUrl.length - "data:image/jpeg;base64,".length;
  const byteEstimate = Math.round((base64Length * 3) / 4);

  return {
    dataUrl,
    byteEstimate,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Compresses a PDF file in-memory within the browser.
 * Renders pages to bounded canvases, compresses images as JPEG with quality & grayscale options,
 * and reassembles using pdf-lib with object streams.
 */
export async function compressPdf(
  file: File,
  options: CompressionOptions = {},
  onProgress?: (progress: CompressionProgress) => void
): Promise<{ file: File; originalBytes: number; compressedBytes: number; savedBytes: number }> {
  const maxDim = options.maxDimension || DEFAULT_MAX_DIMENSION;
  const quality = Math.max(0.1, Math.min(1.0, options.quality ?? DEFAULT_QUALITY));
  const grayscale = Boolean(options.grayscale);
  const originalBytes = file.size;

  onProgress?.({ percent: 10, step: "Initializing PDF tools..." });

  const { PDFLib, pdfjsLib } = await loadPdfTools(onProgress);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const srcPdf = await loadingTask.promise;
  const numPages = srcPdf.numPages;

  onProgress?.({ percent: 20, step: `Processing ${numPages} page(s)...` });

  const targetPdf = await PDFLib.PDFDocument.create();

  for (let i = 1; i <= numPages; i++) {
    const pageProgress = Math.round(20 + ((i - 0.5) / numPages) * 70);
    onProgress?.({
      percent: pageProgress,
      step: `Compressing page ${i} of ${numPages}...`,
    });

    const page = await srcPdf.getPage(i);
    const canvas = document.createElement("canvas");

    await renderPdfPageToCanvas(page, canvas, {
      maxDimension: maxDim,
      grayscale,
    });

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

  onProgress?.({ percent: 95, step: "Finalizing compressed PDF package..." });

  // Save with internal object streams enabled
  const compressedUint8Array = await targetPdf.save({ useObjectStreams: true });
  const compressedBytes = compressedUint8Array.byteLength;

  onProgress?.({ percent: 100, step: "Optimization complete!" });

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
