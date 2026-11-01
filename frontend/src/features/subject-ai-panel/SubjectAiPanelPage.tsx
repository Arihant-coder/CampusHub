
/**
 * @file SubjectAiPanelPage.tsx
 * @description Main view for Subject AI Study Companion Panel feature.
 * @owner Subject AI Panel Team
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useParams } from "react-router-dom";
import { Bot, Trash2 } from "lucide-react";

import { ChatBody } from "./components/ChatPanel";
import { FlashcardsView } from "./components/FlashcardsView";
import { QuizView } from "./components/QuizView";

import {
  StudyMaterialsTray,
  type StudyMaterialsTrayProps,
} from "./components/StudyMaterialsTray";

import { useStudyMaterials } from "./hooks/useStudyMaterials";

import {
  createSavedStudyFile,
  loadSavedStudyFiles,
  saveSavedStudyFiles,
  type SavedStudyFile,
} from "./services/savedStudyFiles";

const BOT_NAME = "Study Assistant";

const TOOLS = [
  { id: "chat", label: "Ask AI" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
] as const;

type Tool = (typeof TOOLS)[number]["id"];

export default function SubjectAiPanelPage({
  subjectName,
}: {
  subjectName?: string;
}) {
  const { subjectId } = useParams<{ subjectId: string }>();

  const [activeTool, setActiveTool] = useState<Tool>("chat");
  const [selectorVisible, setSelectorVisible] = useState(false);

  // Clear conversation action registered by ChatBody.
  const [clearChatHandler, setClearChatHandler] = useState<
    (() => void) | null
  >(null);

  // Shared materials for the active subject.
  const materials = useStudyMaterials(subjectId ?? "");

  const [savedFiles, setSavedFiles] = useState<SavedStudyFile[]>(() =>
    subjectId ? loadSavedStudyFiles(subjectId) : [],
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSavedFileOpen, setIsSavedFileOpen] = useState(false);

  useEffect(() => {
    if (!subjectId) return;
    const files = loadSavedStudyFiles(subjectId);
    setSavedFiles(files);
    setActiveFileId(files[0]?.id ?? null);
  }, [subjectId]);

  useEffect(() => {
    if (subjectId) saveSavedStudyFiles(subjectId, savedFiles);
  }, [savedFiles, subjectId]);

  const activeFile = savedFiles.find((file) => file.id === activeFileId);
  const activeFlashcardDeck =
    activeFile?.kind === "flashcards" ? activeFile.content : null;
  const activeQuiz = activeFile?.kind === "quiz" ? activeFile.content : null;

  function addSavedFile(file: SavedStudyFile) {
    setSavedFiles((previous) => [file, ...previous]);
    setActiveFileId(file.id);
    setIsSavedFileOpen(false);
  }

  function openSavedFile(fileId: string) {
    setActiveFileId(fileId);
    setIsSavedFileOpen(true);
  }

  function renameFile(file: SavedStudyFile) {
    const nextName = window.prompt("Rename file", file.name)?.trim();
    if (!nextName) return;
    setSavedFiles((previous) =>
      previous.map((item) =>
        item.id === file.id ? { ...item, name: nextName } : item,
      ),
    );
  }

  function deleteFile(fileId: string) {
    setSavedFiles((previous) => previous.filter((file) => file.id !== fileId));
    setActiveFileId((current) => (current === fileId ? null : current));
    setIsSavedFileOpen(false);
  }

  const filesForTool = savedFiles.filter((file) =>
    activeTool === "quiz" ? file.kind === "quiz" : file.kind === "flashcards",
  );

  useEffect(() => {
    if (activeTool === "chat") return;
    if (!filesForTool.some((file) => file.id === activeFileId)) {
      setActiveFileId(filesForTool[0]?.id ?? null);
    }
  }, [activeFileId, activeTool, filesForTool]);

  // Shared Study Materials UI state.
  const [materialsExpanded, setMaterialsExpanded] = useState(
    () => materials.materials.length > 0,
  );

  const [chatMaterialsVisible, setChatMaterialsVisible] = useState(true);

  const previousMaterialCount = useRef(materials.materials.length);

  // Preserve materials expansion state while switching tools.
  // Automatically expand when the first file is uploaded.
  useEffect(() => {
    const currentCount = materials.materials.length;
    const previousCount = previousMaterialCount.current;

    if (previousCount === 0 && currentCount > 0) {
      setMaterialsExpanded(true);
      setChatMaterialsVisible(true);
    }

    if (currentCount === 0) {
      setMaterialsExpanded(false);
      setChatMaterialsVisible(true);
    }

    previousMaterialCount.current = currentCount;
  }, [materials.materials.length]);

  // Store the child's callback without executing it.
  const handleClearChatChange = useCallback(
    (handler: (() => void) | null) => {
      setClearChatHandler(() => handler);
    },
    [],
  );

  if (!subjectId) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Open a subject to use the AI study companion.
      </div>
    );
  }

  // Shared materials props used by all three tools.
  const studyMaterialsProps: StudyMaterialsTrayProps = {
    materials: materials.materials,
    isLoading: materials.isLoading,
    uploadingFile: materials.uploadingFile,
    removingId: materials.removingId,
    error: materials.error,

    onAddFiles: (files) => {
      void materials.addFiles(files);
    },

    onToggle: materials.toggleMaterial,

    onRemove: (id) => {
      void materials.removeMaterial(id);
    },

    onDismissError: materials.clearError,

    expanded: materialsExpanded,
    onExpandedChange: setMaterialsExpanded,
  };

  const activeToolLabel =
    TOOLS.find((tool) => tool.id === activeTool)?.label ?? "Ask AI";

  return (
    <div className="flex h-full min-h-0 flex-col">

      {/* Study Assistant header and hover selector */}
      <div
        onMouseEnter={() => setSelectorVisible(true)}
        onMouseLeave={() => setSelectorVisible(false)}
        className="shrink-0"
      >
        <header className="flex h-10 items-center gap-2 border-b px-3">
          <Bot className="size-4 text-muted-foreground" />

          <h2 className="text-sm font-medium">
            {BOT_NAME}
          </h2>

          <div className="ml-auto flex items-center gap-2">

            {/* Clear conversation */}
            {activeTool === "chat" && clearChatHandler && (
              <button
                type="button"
                onClick={clearChatHandler}
                title="Clear conversation"
                aria-label="Clear conversation"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            )}

            {/* Active tool indicator */}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {activeToolLabel}
            </span>
          </div>
        </header>

        {/* Tool selector */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            selectorVisible
              ? "max-h-10 opacity-100"
              : "max-h-0 opacity-0"
          }`}
        >
          <div className="flex items-center gap-0.5 border-b bg-card px-2 py-1">
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                aria-pressed={activeTool === tool.id}
                className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  activeTool === tool.id
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ASK AI */}
      {activeTool === "chat" && (
        <ChatBody
          key={subjectId}
          subjectId={subjectId}
          subjectName={subjectName}
          studyMaterials={studyMaterialsProps}
          materialsVisible={chatMaterialsVisible}
          onToggleMaterialsVisibility={() => {
            setChatMaterialsVisible((previous) => !previous);
          }}
          onClearChatChange={handleClearChatChange}
        />
      )}

      {/* FLASHCARDS */}
      {activeTool === "flashcards" && (
        <StudyToolWorkspace
        >
            <FlashcardsView
              subjectId={subjectId}
              subjectName={subjectName}
              selectedMaterialIds={materials.selectedMaterialIds}
              deck={activeFlashcardDeck}
              onDeckGenerated={(deck) => addSavedFile(createSavedStudyFile("flashcards", deck))}
              savedFiles={filesForTool}
              activeFileId={activeFile?.kind === "flashcards" ? activeFile.id : null}
              onOpenFile={openSavedFile}
              onRenameFile={renameFile}
              onDeleteFile={deleteFile}
              isFileOpen={isSavedFileOpen}
              onCloseFile={() => setIsSavedFileOpen(false)}
            />
          <StudyMaterialsTray {...studyMaterialsProps} showAddButton={true} />
        </StudyToolWorkspace>
      )}

      {/* QUIZ */}
      {activeTool === "quiz" && (
        <StudyToolWorkspace
        >
            <QuizView
              subjectId={subjectId}
              subjectName={subjectName}
              selectedMaterialIds={materials.selectedMaterialIds}
              quiz={activeQuiz}
              onQuizGenerated={(quiz) => addSavedFile(createSavedStudyFile("quiz", quiz))}
              savedFiles={filesForTool}
              activeFileId={activeFile?.kind === "quiz" ? activeFile.id : null}
              onOpenFile={(fileId) => {
                setActiveFileId(fileId);
                setIsSavedFileOpen(true);
              }}
              onRenameFile={renameFile}
              onDeleteFile={deleteFile}
              isFileOpen={isSavedFileOpen}
              onCloseFile={() => setIsSavedFileOpen(false)}
            />
          <StudyMaterialsTray {...studyMaterialsProps} showAddButton={true} />
        </StudyToolWorkspace>
      )}
    </div>
  );
}

function StudyToolWorkspace({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col bg-background">{children}</div>;
}
