import { mockSubjectViewerService } from "./mockService";
import { realSubjectViewerService } from "./realService";
import type { SubjectViewerService } from "./types";

export * from "./types";
export * from "./documentCache";

export const subjectViewerService: SubjectViewerService = import.meta.env.VITE_USE_MOCKS !== "false"
  ? mockSubjectViewerService
  : realSubjectViewerService;
