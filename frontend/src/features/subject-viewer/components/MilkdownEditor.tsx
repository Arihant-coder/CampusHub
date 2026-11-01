import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import { useEffect, useRef } from "react";

interface Props {
  initialValue: string;
  onChange: (markdown: string) => void;
}

/** A rich WYSIWYG editor whose source of truth remains portable Markdown. */
export function MilkdownEditor({ initialValue, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!rootRef.current) return;
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
    editor.on((listener) => listener.markdownUpdated((_ctx, markdown) => onChangeRef.current(markdown)));
    void editor.create();
    return () => { void editor.destroy(); };
    // The parent keys this component by note id, so a new note safely gets a new editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={rootRef} className="milkdown-editor min-h-0 flex-1 overflow-y-auto" />;
}
