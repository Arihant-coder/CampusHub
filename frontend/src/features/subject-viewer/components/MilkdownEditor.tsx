import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "./milkdown-theme.css";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2, Save, Trash2 } from "lucide-react";

interface Props {
  initialValue: string;
  onChange: (markdown: string) => void;
  onSave?: () => void;
  onDelete?: () => void;
  isDirty?: boolean;
  saving?: boolean;
}

const TOOLBAR_TOOLTIPS: { pattern: RegExp; title: string; label: string }[] = [
  { pattern: /M8\.85758/i, title: "Bold (Ctrl+B)", label: "Bold" },
  { pattern: /M6\.29811/i, title: "Italic (Ctrl+I)", label: "Italic" },
  { pattern: /M3\.25 13\.7404/i, title: "Strikethrough (~~text~~ / Ctrl+Shift+X)", label: "Strikethrough" },
  { pattern: /M9\.4 16\.6L4\.8/i, title: "Inline Code (`code`)", label: "Inline Code" },
  { pattern: /clip0_977_8070/i, title: "Bullet List (- space)", label: "Bullet List" },
  { pattern: /M4\.5 5|4\.88 11\.04|977_8072/i, title: "Numbered List (1. space)", label: "Numbered List" },
  { pattern: /M5\.66936/i, title: "Task List ([ ] space)", label: "Task List" },
  { pattern: /M17\.0385/i, title: "Insert Link (Ctrl+K)", label: "Insert Link" },
  { pattern: /clip0_977_8075|M19 5V19H5/i, title: "Insert Image", label: "Insert Image" },
  { pattern: /clip0_977_8078/i, title: "Insert Table", label: "Insert Table" },
  { pattern: /M3 3h18a1/i, title: "Code Block (```)", label: "Code Block" },
  { pattern: /M7 19v-\.808L13\.096/i, title: "LaTeX Math Formula ($$)", label: "Math Formula" },
  { pattern: /clip0_977_7897/i, title: "Quote (> space)", label: "Quote" },
  { pattern: /clip0_977_7900/i, title: "Horizontal Divider (---)", label: "Horizontal Divider" },
];

function applyTopBarTooltips(root: HTMLElement) {
  const topBar = root.querySelector(".milkdown-top-bar");
  if (!topBar) return;

  const headingBtn = topBar.querySelector(".top-bar-heading-button");
  if (headingBtn && !headingBtn.hasAttribute("title")) {
    headingBtn.setAttribute("title", "Text Style (Heading 1-6, Paragraph)");
    headingBtn.setAttribute("aria-label", "Text Style");
  }

  const items = topBar.querySelectorAll<HTMLButtonElement>(".top-bar-item");
  items.forEach((btn) => {
    if (btn.hasAttribute("title")) return;
    const html = btn.innerHTML;
    for (const rule of TOOLBAR_TOOLTIPS) {
      if (rule.pattern.test(html)) {
        btn.setAttribute("title", rule.title);
        btn.setAttribute("aria-label", rule.label);
        break;
      }
    }
  });
}

function ensureTopBarActionsSlot(root: HTMLElement): HTMLElement | null {
  const topBar = root.querySelector<HTMLElement>(".milkdown-top-bar");
  if (!topBar) return null;

  // Append directly to .milkdown-top-bar as a sibling to .top-bar-inner so Vue diff never removes it
  let actionsSlot = topBar.querySelector<HTMLElement>(":scope > .milkdown-topbar-actions");
  if (!actionsSlot) {
    actionsSlot = document.createElement("div");
    actionsSlot.className = "milkdown-topbar-actions";
    topBar.appendChild(actionsSlot);
  }
  return actionsSlot;
}

function setupEditorObserver(root: HTMLElement, onSlotReady: (slot: HTMLElement) => void) {
  let lastCursorRect: DOMRect | null = null;

  const handleSelectionChange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) {
      lastCursorRect = rect;
    }
  };

  document.addEventListener("selectionchange", handleSelectionChange);

  // Monitor link popup and dynamic top bar rendering
  const observer = new MutationObserver(() => {
    applyTopBarTooltips(root);

    const slot = ensureTopBarActionsSlot(root);
    if (slot) {
      onSlotReady(slot);
    }

    const linkEditEl = root.querySelector<HTMLElement>(".milkdown-link-edit");
    const milkdownEl = root.querySelector<HTMLElement>(".milkdown");

    if (linkEditEl && milkdownEl && linkEditEl.dataset.show === "true" && lastCursorRect) {
      const parentRect = milkdownEl.getBoundingClientRect();
      const cursorX = lastCursorRect.left - parentRect.left;
      const cursorBottom = lastCursorRect.bottom - parentRect.top;
      const popupWidth = linkEditEl.offsetWidth || 260;

      // Align input field directly beneath active cursor position
      const targetLeft = Math.max(
        16,
        Math.min(cursorX - 20, parentRect.width - popupWidth - 16)
      );
      const targetTop = cursorBottom + 8;

      const currentLeft = parseFloat(linkEditEl.style.left || "0");
      const currentTop = parseFloat(linkEditEl.style.top || "0");

      if (Math.abs(currentLeft - targetLeft) > 8 || Math.abs(currentTop - targetTop) > 8) {
        linkEditEl.style.left = `${targetLeft}px`;
        linkEditEl.style.top = `${targetTop}px`;
      }
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-show", "style"],
  });

  return () => {
    document.removeEventListener("selectionchange", handleSelectionChange);
    observer.disconnect();
  };
}

/** A rich WYSIWYG editor whose source of truth remains portable Markdown. */
export function MilkdownEditor({
  initialValue,
  onChange,
  onSave,
  onDelete,
  isDirty = false,
  saving = false,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [topBarActionsContainer, setTopBarActionsContainer] = useState<HTMLElement | null>(null);

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving && onSave) {
          onSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saving, onSave]);

  useEffect(() => {
    if (!rootRef.current) return;
    let cancelled = false;
    let created = false;
    let cleanupObserver: (() => void) | undefined;
    let isInitialized = false;

    const editor = new Crepe({
      root: rootRef.current,
      defaultValue: initialValue || "# Untitled note\n\nStart writing…",
      // Crepe's bubble toolbar is enabled by default. CampusHub instead uses
      // the persistent top bar, which makes heading/bold/list controls visible.
      features: {
        [Crepe.Feature.TopBar]: true,
        [Crepe.Feature.Toolbar]: false,
      },
      featureConfigs: {
        [Crepe.Feature.Placeholder]: { text: "Start writing your Markdown note…", mode: "block" },
      },
    });

    // Guard against firing onChange on initial mount/parse cycle to prevent false unsaved dots
    editor.on((listener) =>
      listener.markdownUpdated((_ctx, markdown) => {
        if (!isInitialized) return;
        onChangeRef.current(markdown);
      })
    );

    void editor.create().then(() => {
      created = true;
      if (cancelled) {
        void editor.destroy();
        return;
      }
      if (rootRef.current) {
        applyTopBarTooltips(rootRef.current);
        cleanupObserver = setupEditorObserver(rootRef.current, (slot) => {
          setTopBarActionsContainer((prev) => (prev === slot ? prev : slot));
        });

        const slot = ensureTopBarActionsSlot(rootRef.current);
        if (slot) {
          setTopBarActionsContainer(slot);
        }
      }

      // Mark initialized after initial parse completes
      setTimeout(() => {
        if (!cancelled) {
          isInitialized = true;
        }
      }, 100);
    });

    return () => {
      cancelled = true;
      cleanupObserver?.();
      if (created) {
        void editor.destroy();
      }
    };
    // The parent keys this component by note id, so a new note safely gets a new editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef} className="milkdown-editor min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      {topBarActionsContainer &&
        createPortal(
          <div className="flex items-center gap-1.5">
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Delete note"
                aria-label="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}

            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !isDirty}
                className={`h-7 px-3 flex items-center gap-1.5 rounded text-xs font-medium transition-all shadow-xs ${
                  saving
                    ? "opacity-60 cursor-wait bg-primary text-primary-foreground"
                    : isDirty
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                    : "bg-secondary/70 text-muted-foreground hover:bg-secondary cursor-default"
                }`}
                title={isDirty ? "Save note (Ctrl+S)" : "All changes saved (Ctrl+S)"}
                aria-label="Save note"
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isDirty ? (
                  <Save className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                )}
                <span>{saving ? "Saving…" : isDirty ? "Save" : "Saved"}</span>
              </button>
            )}
          </div>,
          topBarActionsContainer
        )}
    </div>
  );
}
