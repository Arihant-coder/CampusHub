import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  generateQuiz,
  type GeneratedQuiz,
} from "../services/studyTools";
import { SavedStudyFilesList } from "./SavedStudyFilesList";
import type { SavedStudyFile } from "../services/savedStudyFiles";

interface Props {
  subjectId: string;
  subjectName?: string;
  selectedMaterialIds: string[];
  quiz: GeneratedQuiz | null;
  onQuizGenerated: (quiz: GeneratedQuiz) => void;
  savedFiles: SavedStudyFile[];
  activeFileId: string | null;
  onOpenFile: (id: string) => void;
  onRenameFile: (file: SavedStudyFile) => void;
  onDeleteFile: (id: string) => void;
  isFileOpen: boolean;
  onCloseFile: () => void;
}

export function QuizView({
  subjectId,
  subjectName,
  selectedMaterialIds,
  quiz,
  onQuizGenerated,
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
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFileExpanded, setIsFileExpanded] = useState(false);

  const questions = quiz?.questions ?? [];
  const currentQ = questions[currentIndex];
  const hasAnswered = selectedOption !== null;

  // Start a fresh attempt when a new quiz is generated.
  useEffect(() => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsFinished(false);
  }, [quiz]);

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
      setGenerationError("Select at least one study material above.");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const generated = await generateQuiz({
        subjectId,
        materialIds: selectedMaterialIds,
        topic,
        count: Number(count),
      });

      onQuizGenerated(generated);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Could not generate the quiz. Please try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  function handleSelectOption(index: number) {
    if (hasAnswered || !currentQ) return;

    setSelectedOption(index);

    if (index === currentQ.correctIndex) {
      setScore((previous) => previous + 1);
    }
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsFinished(false);
  }

  const percentage =
    questions.length > 0
      ? Math.round((score / questions.length) * 100)
      : 0;

  const savedQuizViewer = quiz && (
    <div className="flex h-full w-full flex-col border bg-background shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold">{quiz.title}</h2>
          <p className="text-xs text-muted-foreground">
            {isFinished
              ? `${score} / ${questions.length} correct · ${percentage}%`
              : `Question ${currentIndex + 1} of ${questions.length}`}
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
          aria-label="Close quiz file"
          title="Close viewer"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto p-5">
        {isFinished ? (
          <div className="flex w-full max-w-xl flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-lg font-semibold">Quiz completed</h3>
            <p className="mt-3 text-3xl font-bold">{score} / {questions.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">{percentage}% correct</p>
            <Button onClick={handleRestart} className="mt-6 gap-2">
              <RotateCcw className="size-4" /> Retake quiz
            </Button>
          </div>
        ) : currentQ ? (
          <div className="w-full max-w-2xl space-y-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
              <p className="text-lg font-medium leading-relaxed sm:text-xl">
                {currentQ.question}
              </p>
            </div>
            <div className="space-y-2">
              {currentQ.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const isCorrect = index === currentQ.correctIndex;
                let optionStyle = "border-border bg-card hover:bg-muted/60 text-foreground";
                if (hasAnswered) {
                  if (isCorrect) optionStyle = "border-emerald-500 bg-emerald-500/10 text-foreground font-medium";
                  else if (isSelected) optionStyle = "border-destructive bg-destructive/10 text-destructive font-medium";
                  else optionStyle = "border-border/60 opacity-60 text-muted-foreground";
                }
                return (
                  <button
                    key={`${currentIndex}-${index}`}
                    type="button"
                    disabled={hasAnswered}
                    onClick={() => handleSelectOption(index)}
                    className={cn("flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition-all", optionStyle, hasAnswered && "cursor-default")}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 leading-relaxed">{option}</span>
                    {hasAnswered && isCorrect && <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                    {hasAnswered && isSelected && !isCorrect && <XCircle className="size-4 shrink-0 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {hasAnswered && (
              <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                <p className="mb-1 font-semibold">
                  {selectedOption === currentQ.correctIndex ? "Correct!" : "Explanation"}
                </p>
                <p className="leading-relaxed text-muted-foreground">{currentQ.explanation}</p>
              </div>
            )}
            {hasAnswered && (
              <div className="flex justify-end">
                <Button onClick={handleNext} className="gap-2">
                  {currentIndex < questions.length - 1 ? "Next question" : "Finish quiz"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-y-auto">
      {/* Quiz generation controls */}
      <section className="shrink-0 space-y-3 border-b p-3">
        <div>
          <h3 className="text-sm font-semibold">
            {quiz?.title ?? "Generate Practice Quiz"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {subjectName ?? "Current Subject"}
          </p>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="quiz-topic"
            className="text-xs font-medium"
          >
            Topic (optional)
          </label>

          <input
            id="quiz-topic"
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
              htmlFor="quiz-count"
              className="text-xs font-medium"
            >
              Number of questions
            </label>

            <select
              id="quiz-count"
              value={count}
              onChange={(event) => setCount(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs"
            >
              <option value="5">5 questions</option>
              <option value="10">10 questions</option>
              <option value="15">15 questions</option>
              <option value="20">20 questions</option>
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

            {isGenerating ? "Generating..." : "Generate"}
          </Button>
        </div>

        {selectedMaterialIds.length === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Select at least one file in Study materials above.
          </p>
        )}

        {generationError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            <span>{generationError}</span>
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

      {/* Empty state before the first quiz */}
      {!quiz && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <HelpCircle className="size-8 text-muted-foreground" />

          <h4 className="text-sm font-medium">
            Your practice quiz will appear here
          </h4>

          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            Select your study materials, optionally specify a topic,
            and generate questions from your notes.
          </p>
        </div>
      )}

      {isFileOpen && savedQuizViewer &&
        (isFileExpanded
          ? createPortal(
              <div className="fixed inset-0 z-[100] flex h-dvh w-screen items-center justify-center bg-background/30 p-3 backdrop-blur-md sm:p-6 lg:p-8">
                <div className="h-full max-h-[900px] w-full max-w-[1440px] overflow-hidden rounded-2xl border bg-background shadow-2xl">
                  {savedQuizViewer}
                </div>
              </div>,
              document.body,
            )
          : (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/70 p-3 backdrop-blur-sm">
                <div className="h-full max-h-full w-full overflow-hidden rounded-2xl border bg-background shadow-2xl">
                  {savedQuizViewer}
                </div>
              </div>
            ))}
    </div>
  );
}
