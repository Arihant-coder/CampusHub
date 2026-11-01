import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  generateFlashcards,
  type GeneratedFlashcardDeck,
} from "../services/studyTools";
import { SavedStudyFilesList } from "./SavedStudyFilesList";
import type { SavedStudyFile } from "../services/savedStudyFiles";

interface Props {
  subjectId: string;
  subjectName?: string;
  selectedMaterialIds: string[];
  deck: GeneratedFlashcardDeck | null;
  onDeckGenerated: (deck: GeneratedFlashcardDeck) => void;
  savedFiles: SavedStudyFile[];
  activeFileId: string | null;
  onOpenFile: (id: string) => void;
  onRenameFile: (file: SavedStudyFile) => void;
  onDeleteFile: (id: string) => void;
  isFileOpen: boolean;
  onCloseFile: () => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Could not generate flashcards. Please try again.";
}

export function FlashcardsView({
  subjectId,
  subjectName,
  selectedMaterialIds,
  deck,
  onDeckGenerated,
  savedFiles,
  activeFileId,
  onOpenFile,
  onRenameFile,
  onDeleteFile,
  isFileOpen,
  onCloseFile,
}: Props) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("10");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFileExpanded, setIsFileExpanded] = useState(false);

  const cards = deck?.cards ?? [];
  const currentCard = cards[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [deck]);

  useEffect(() => {
    if (!isFileOpen) setIsFileExpanded(false);
  }, [isFileOpen]);

  useEffect(() => {
    if (!isFileExpanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFileExpanded]);

  async function handleGenerate() {
    if (isGenerating) return;

    if (selectedMaterialIds.length === 0) {
      setError("Select at least one study material above.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const generatedDeck = await generateFlashcards({
        subjectId,
        materialIds: selectedMaterialIds,
        topic,
        count: Number(count),
      });

      onDeckGenerated(generatedDeck);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  }

  function handleNext() {
    setIsFlipped(false);
    setCurrentIndex((previous) => (previous + 1) % cards.length);
  }

  function handlePrevious() {
    setIsFlipped(false);
    setCurrentIndex((previous) =>
      (previous - 1 + cards.length) % cards.length,
    );
  }

  function handleFlip() {
    setIsFlipped((previous) => !previous);
  }

  const savedDeckViewer = deck && currentCard && (
    <div className="flex h-full w-full flex-col border bg-background shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{deck.title}</h2>
          <p className="text-xs text-muted-foreground">
            {currentIndex + 1} of {cards.length} cards
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsFileExpanded((previous) => !previous)}
          aria-label={isFileExpanded ? "Collapse viewer" : "Expand viewer"}
          title={isFileExpanded ? "Collapse viewer" : "Expand viewer"}
        >
          {isFileExpanded ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCloseFile}
          aria-label="Close flashcard file"
          title="Close viewer"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-5">
        <button
          type="button"
          onClick={handleFlip}
          className="flex min-h-[300px] w-full max-w-xl flex-col justify-between rounded-xl border bg-card p-6 text-left shadow-sm hover:border-primary/50"
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">
              {isFlipped ? "Answer" : "Question"}
            </span>
            <span className="flex items-center gap-1">
              <RotateCw className="size-3.5" /> Click to flip
            </span>
          </div>
          <p className="whitespace-pre-line py-6 text-xl font-medium leading-relaxed">
            {isFlipped ? currentCard.answer : currentCard.question}
          </p>
          <span className="text-right text-xs text-muted-foreground">
            {isFlipped ? "Click to see question" : "Click to reveal answer"}
          </span>
        </button>
        <div className="flex w-full max-w-xl items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={cards.length < 2}
          >
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <Button variant="outline" onClick={handleFlip}>
            <RotateCw className="size-3.5" /> Flip
          </Button>
          <Button
            variant="outline"
            onClick={handleNext}
            disabled={cards.length < 2}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Generation controls */}
      <section className="shrink-0 space-y-3 border-b p-3">
        <div>
          <h3 className="text-sm font-semibold">
            {deck ? deck.title : "Generate Flashcards"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {subjectName ?? "Current Subject"}
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="flashcard-topic"
            className="text-xs font-medium"
          >
            Topic (optional)
          </label>
          <input
            id="flashcard-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            maxLength={150}
            placeholder="e.g. Normalization, SQL, Transactions"
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <label
              htmlFor="flashcard-count"
              className="text-xs font-medium"
            >
              Number of cards
            </label>
            <select
              id="flashcard-count"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs"
            >
              <option value="5">5 cards</option>
              <option value="10">10 cards</option>
              <option value="15">15 cards</option>
              <option value="20">20 cards</option>
              <option value="30">30 cards</option>
            </select>
          </div>

          <Button
            onClick={() => void handleGenerate()}
            disabled={isGenerating || selectedMaterialIds.length === 0}
            className="h-9 gap-1.5 text-xs"
          >
            {isGenerating ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {isGenerating ? "Generating…" : "Generate"}
          </Button>
        </div>

        {selectedMaterialIds.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Select at least one file in Study materials above.
          </p>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </section>

      <SavedStudyFilesList
        files={savedFiles}
        activeFileId={activeFileId}
        onOpen={onOpenFile}
        onRename={onRenameFile}
        onDelete={onDeleteFile}
      />

      {/* Empty state */}
      {!deck && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <h4 className="text-sm font-medium">
            Your flashcards will appear here
          </h4>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Select study materials, optionally enter a topic, and generate
            cards based on your notes.
          </p>
        </div>
      )}

      {isFileOpen && savedDeckViewer &&
        (isFileExpanded
          ? createPortal(
              <div className="fixed inset-0 z-[100] flex h-dvh w-screen items-center justify-center bg-background/30 p-3 backdrop-blur-md sm:p-6 lg:p-8">
                <div className="h-full max-h-[900px] w-full max-w-[1440px] overflow-hidden rounded-2xl border bg-background shadow-2xl">
                  {savedDeckViewer}
                </div>
              </div>,
              document.body,
            )
          : (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-3 backdrop-blur-sm">
                <div className="h-full max-h-full w-full overflow-hidden rounded-2xl border bg-background shadow-2xl">
                  {savedDeckViewer}
                </div>
              </div>
            ))}
    </div>
  );
}
