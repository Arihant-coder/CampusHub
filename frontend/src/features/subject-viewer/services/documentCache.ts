/**
 * @file documentCache.ts
 * @description Persistent browser Cache Storage manager for academic PDFs and resources.
 *              Stores downloaded PDFs locally in the browser's Cache API so closing and
 *              reopening tabs or subjects requires 0 network re-downloads.
 * @owner Subject Viewer Team
 */

const CACHE_NAME = "campushub-pdf-cache-v1";

function makeCacheKey(storagePath: string, version?: string): Request {
  const cleanPath = encodeURIComponent(storagePath.replace(/^[/\\]+/, ""));
  const ver = encodeURIComponent(version || "v1");
  // Synthetic HTTPS URL used as standard Cache Storage request key
  return new Request(`https://campushub.internal/cached-docs/${cleanPath}?v=${ver}`);
}

/**
 * Retrieves a document from the persistent browser Cache API.
 * If not yet cached, fetches from the network once, caches the binary response,
 * and returns an in-memory Object URL for PDF.js.
 */
export async function getCachedDocumentBlobUrl(
  storagePath: string,
  version: string | undefined,
  fetchUrl: () => Promise<string>
): Promise<string> {
  // If Cache API is not supported in the current environment, fallback to direct URL
  if (typeof window === "undefined" || !("caches" in window)) {
    return await fetchUrl();
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const requestKey = makeCacheKey(storagePath, version);

    // 1. Check local persistent cache first (instant local hit, 0 network requests)
    const match = await cache.match(requestKey);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }

    // 2. Cache miss: retrieve signed / resource URL from backend
    const directUrl = await fetchUrl();

    try {
      const response = await fetch(directUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching document`);
      }

      // Clone response and persist into Cache Storage
      const responseClone = response.clone();
      await cache.put(requestKey, responseClone);

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (networkOrCorsError) {
      // If fetch fails (e.g. CORS on third-party storage), fallback to direct URL
      console.warn("Direct binary caching unavailable, falling back to direct URL:", networkOrCorsError);
      return directUrl;
    }
  } catch (cacheError) {
    console.warn("Cache API lookup failed, falling back to network:", cacheError);
    return await fetchUrl();
  }
}

/**
 * Removes a specific document from local cache if it is deleted or updated.
 */
export async function invalidateCachedDocument(storagePath: string): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const encoded = encodeURIComponent(storagePath.replace(/^[/\\]+/, ""));
    for (const key of keys) {
      if (key.url.includes(`/cached-docs/${encoded}`)) {
        await cache.delete(key);
      }
    }
  } catch (err) {
    console.warn("Failed to invalidate document cache:", err);
  }
}

/**
 * Clears the entire local document cache.
 */
export async function clearAllDocumentCache(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    await caches.delete(CACHE_NAME);
  } catch (err) {
    console.warn("Failed to clear document cache:", err);
  }
}
