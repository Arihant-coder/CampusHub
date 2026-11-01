/**
 * @file FormattedText.tsx
 * @description Safe and compact markdown renderer for post bodies and comments.
 * @owner Communities Team
 */

import React from "react";
import { useImageViewer } from "@/lib/image-viewer-context";

/**
 * Strict URL sanitizer to prevent XSS payloads (e.g. javascript:, data:, vbscript:).
 * Only permits http://, https://, mailto:, or relative paths.
 */
function sanitizeUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (/^(javascript:|data:|vbscript:)/i.test(trimmed)) {
    return null;
  }
  if (/^(https?:\/\/|mailto:|\/)/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

interface FormattedTextProps {
  content: string;
  className?: string;
}

export function FormattedText({ content, className = "" }: FormattedTextProps) {
  const { openImageViewer } = useImageViewer();
  if (!content) return null;

  // Split into lines or paragraphs
  const lines = content.split("\n");

  const parseInline = (text: string): React.ReactNode[] => {
    // Regex matches bold, italic, strike, inline code, links
    const tokens: React.ReactNode[] = [];
    let remainder = text;
    let keyIdx = 0;

    while (remainder.length > 0) {
      // Bold: **text**
      const boldMatch = remainder.match(/^(\*\*|__)(.+?)\1/);
      if (boldMatch) {
        tokens.push(
          <strong key={keyIdx++} className="font-semibold text-foreground">
            {boldMatch[2]}
          </strong>
        );
        remainder = remainder.slice(boldMatch[0].length);
        continue;
      }

      // Strikethrough: ~~text~~
      const strikeMatch = remainder.match(/^~~(.+?)~~/);
      if (strikeMatch) {
        tokens.push(
          <del key={keyIdx++} className="line-through text-muted-foreground">
            {strikeMatch[1]}
          </del>
        );
        remainder = remainder.slice(strikeMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remainder.match(/^(\*|_)(.+?)\1/);
      if (italicMatch) {
        tokens.push(
          <em key={keyIdx++} className="italic text-foreground">
            {italicMatch[2]}
          </em>
        );
        remainder = remainder.slice(italicMatch[0].length);
        continue;
      }

      // Inline code: `text`
      const codeMatch = remainder.match(/^`([^`]+)`/);
      if (codeMatch) {
        tokens.push(
          <code
            key={keyIdx++}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground border border-border/50"
          >
            {codeMatch[1]}
          </code>
        );
        remainder = remainder.slice(codeMatch[0].length);
        continue;
      }

      // Image: ![alt](url)
      const imgMatch = remainder.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        const safeImgSrc = sanitizeUrl(imgMatch[2]);
        if (safeImgSrc) {
          const imgAlt = imgMatch[1] || "Attached image";
          tokens.push(
            <img
              key={keyIdx++}
              src={safeImgSrc}
              alt={imgAlt}
              onClick={(e) => {
                e.stopPropagation();
                openImageViewer({
                  images: [safeImgSrc],
                  initialIndex: 0,
                  title: imgAlt,
                });
              }}
              className="my-2 max-h-60 max-w-sm rounded-lg border object-cover shadow-2xs cursor-zoom-in hover:opacity-95 transition-opacity"
              loading="lazy"
              title="Click to expand full screen"
            />
          );
        }
        remainder = remainder.slice(imgMatch[0].length);
        continue;
      }

      // Link: [text](url)
      const linkMatch = remainder.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const safeHref = sanitizeUrl(linkMatch[2]);
        if (safeHref) {
          tokens.push(
            <a
              key={keyIdx++}
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {linkMatch[1]}
            </a>
          );
        } else {
          // If URL is unsafe/malicious, render harmlessly as plain text without link tag
          tokens.push(linkMatch[1]);
        }
        remainder = remainder.slice(linkMatch[0].length);
        continue;
      }

      // Mention: @handle (3-20 chars alphanumeric + underscore)
      const mentionMatch = remainder.match(/^@([a-zA-Z0-9_]{3,20})\b/);
      if (mentionMatch) {
        const handle = mentionMatch[1];
        tokens.push(
          <a
            key={keyIdx++}
            href={`/u/${handle}`}
            className="text-primary hover:underline font-semibold bg-primary/10 px-1 py-0.5 rounded text-[0.9em]"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            @{handle}
          </a>
        );
        remainder = remainder.slice(mentionMatch[0].length);
        continue;
      }

      // Plain character or text chunk up to next special char
      const nextSpecial = remainder.search(/[*_~`[!@]/);
      if (nextSpecial === -1) {
        tokens.push(remainder);
        break;
      } else if (nextSpecial === 0) {
        // Escaped or unmatched marker
        tokens.push(remainder[0]);
        remainder = remainder.slice(1);
      } else {
        tokens.push(remainder.slice(0, nextSpecial));
        remainder = remainder.slice(nextSpecial);
      }
    }

    return tokens;
  };

  const renderedBlocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check code fence ```
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        renderedBlocks.push(
          <pre
            key={`cb-${i}`}
            className="my-2 overflow-x-auto rounded-lg bg-muted/80 p-3 font-mono text-xs text-foreground border"
          >
            <code>{codeBlockBuffer.join("\n")}</code>
          </pre>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    // Header 1-3
    if (line.startsWith("### ")) {
      renderedBlocks.push(
        <h4 key={`h3-${i}`} className="font-semibold text-sm mt-2 mb-1 text-foreground">
          {parseInline(line.replace("### ", ""))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      renderedBlocks.push(
        <h3 key={`h2-${i}`} className="font-bold text-base mt-2.5 mb-1 text-foreground">
          {parseInline(line.replace("## ", ""))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      renderedBlocks.push(
        <h2 key={`h1-${i}`} className="font-extrabold text-lg mt-3 mb-1 text-foreground">
          {parseInline(line.replace("# ", ""))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      renderedBlocks.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-primary/60 pl-3 py-0.5 my-1 text-muted-foreground italic text-xs sm:text-sm bg-muted/20 rounded-r"
        >
          {parseInline(line.replace(/^>\s*/, ""))}
        </blockquote>
      );
      continue;
    }

    // Bullet List
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      renderedBlocks.push(
        <li key={`li-${i}`} className="ml-4 list-disc text-xs sm:text-sm text-foreground my-0.5">
          {parseInline(line.trim().replace(/^[-*]\s+/, ""))}
        </li>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      renderedBlocks.push(
        <li key={`nli-${i}`} className="ml-4 list-decimal text-xs sm:text-sm text-foreground my-0.5">
          {parseInline(numMatch[2])}
        </li>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      renderedBlocks.push(<div key={`sp-${i}`} className="h-2" />);
      continue;
    }

    // Regular line
    renderedBlocks.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-foreground leading-relaxed">
        {parseInline(line)}
      </p>
    );
  }

  return <div className={`space-y-1 ${className}`}>{renderedBlocks}</div>;
}

