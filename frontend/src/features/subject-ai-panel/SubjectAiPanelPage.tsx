
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

import type {
  GeneratedFlashcardDeck,
  GeneratedQuiz,
} from "./services/studyTools";

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

  // Generated content is stored separately for each subject.
  const [flashcardDecks, setFlashcardDecks] = useState<
    Record<string, GeneratedFlashcardDeck>
  >({});

  const [quizzes, setQuizzes] = useState<
    Record<string, GeneratedQuiz>
  >({});

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
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <FlashcardsView
              subjectId={subjectId}
              subjectName={subjectName}
              selectedMaterialIds={materials.selectedMaterialIds}
              deck={flashcardDecks[subjectId] ?? null}
              onDeckGenerated={(deck) => {
                setFlashcardDecks((previous) => ({
                  ...previous,
                  [subjectId]: deck,
                }));
              }}
            />
          </div>

          <StudyMaterialsTray
            {...studyMaterialsProps}
            showAddButton={true}
          />
        </div>
      )}

      {/* QUIZ */}
      {activeTool === "quiz" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden">
            <QuizView
              subjectId={subjectId}
              subjectName={subjectName}
              selectedMaterialIds={materials.selectedMaterialIds}
              quiz={quizzes[subjectId] ?? null}
              onQuizGenerated={(quiz) => {
                setQuizzes((previous) => ({
                  ...previous,
                  [subjectId]: quiz,
                }));
              }}
            />
          </div>

          <StudyMaterialsTray
            {...studyMaterialsProps}
            showAddButton={true}
          />
        </div>
      )}
    </div>
  );
}
