/**
 * @file PdfJsViewer.tsx
 * @description Official Mozilla PDF.js Web Viewer integration.
 *              Embedded via iframe pointing to the local prebuilt /pdfjs/web/viewer.html.
 *              Features native continuous mouse-wheel scrolling, full PDF toolbar,
 *              thumbnail drawer, text search, and zero title header clutter.
 * @owner Subject Viewer Team
 */

import React from "react";

interface Props {
  url: string;
  title: string;
}

export function PdfJsViewer({ url, title }: Props) {
  // Pass file URL and default to page-width zoom for full readability
  const viewerUrl = `/pdfjs/web/viewer.html?file=${encodeURIComponent(url)}#zoom=page-width`;

  return (
    <div className="w-full h-full min-h-0 flex-1 overflow-hidden bg-background">
      <iframe
        src={viewerUrl}
        title={title}
        className="w-full h-full border-0 block"
        allow="fullscreen"
      />
    </div>
  );
}
