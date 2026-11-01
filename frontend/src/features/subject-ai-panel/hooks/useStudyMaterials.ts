import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearStudyMaterials,
  deleteStudyMaterial,
  StudyMaterialApiError,
  uploadStudyMaterial,
  type UploadedStudyMaterial,
} from "../services/studyMaterials";

export const MAX_STUDY_MATERIALS = 5;
export const MAX_STUDY_MATERIAL_BYTES = 20 * 1024 * 1024;

export type StudyMaterial = UploadedStudyMaterial & {
  selected: boolean;
};

// Uploaded materials belong to this page session and are cleared on refresh.
const materialCache = new Map<string, StudyMaterial[]>();
const sessionInitialization = new Map<string, Promise<void>>();
const initializedSubjects = new Set<string>();

function loadCachedMaterials(subjectId: string): StudyMaterial[] {
  if (!subjectId) return [];

  const cached = materialCache.get(subjectId);

  if (cached !== undefined) return cached;

  materialCache.set(subjectId, []);
  return [];
}

function saveCachedMaterials(
  subjectId: string,
  materials: StudyMaterial[],
): void {
  materialCache.set(subjectId, materials);
}

function initializeSubjectSession(subjectId: string): Promise<void> {
  const existing = sessionInitialization.get(subjectId);
  if (existing) return existing;

  // The first mount in a fresh browser runtime clears uploads left by the
  // previous page session (and legacy persistent records on the backend).
  saveCachedMaterials(subjectId, []);
  const initialization = clearStudyMaterials(subjectId)
    .then(() => {
      initializedSubjects.add(subjectId);
    })
    .catch((error: unknown) => {
      sessionInitialization.delete(subjectId);
      throw error;
    });
  sessionInitialization.set(subjectId, initialization);
  return initialization;
}

function errorMessage(error: unknown): string {
  if (error instanceof StudyMaterialApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Could not handle this study material. Please try again.";
}

function supportsFile(file: File): boolean {
  return /\.(pdf|txt|md)$/i.test(file.name);
}

export function useStudyMaterials(subjectId: string) {
  const [materials, setMaterials] = useState<StudyMaterial[]>(
    () => loadCachedMaterials(subjectId),
  );

  const [isLoading, setIsLoading] = useState(Boolean(subjectId));
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSubjectIdRef = useRef(subjectId);

  // Do not restore backend or browser-cached uploads on mount. A refresh starts
  // with an empty tray, and uploads are kept only in this page's memory.
  useEffect(() => {
    activeSubjectIdRef.current = subjectId;
    setError(null);
    setUploadingFile(null);
    setRemovingId(null);
    if (!subjectId) {
      setIsLoading(false);
      return;
    }

    if (initializedSubjects.has(subjectId)) {
      setMaterials(loadCachedMaterials(subjectId));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isCurrent = true;
    void initializeSubjectSession(subjectId)
      .then(() => {
        if (!isCurrent) return;
        setMaterials([]);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!isCurrent) return;
        setMaterials([]);
        setError(errorMessage(err));
        setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [subjectId]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const requestedSubjectId = subjectId;

      if (!requestedSubjectId || uploadingFile || isLoading) return;

      setError(null);

      let current = loadCachedMaterials(requestedSubjectId);
      const errors: string[] = [];

      for (const file of files) {
        if (current.length >= MAX_STUDY_MATERIALS) {
          errors.push(
            `You can attach up to ${MAX_STUDY_MATERIALS} files to one subject.`,
          );
          break;
        }

        if (!supportsFile(file)) {
          errors.push(`${file.name}: choose a PDF, TXT or MD file.`);
          continue;
        }

        if (file.size > MAX_STUDY_MATERIAL_BYTES) {
          errors.push(`${file.name}: the maximum file size is 20 MB.`);
          continue;
        }

        if (file.size === 0) {
          errors.push(`${file.name}: the file is empty.`);
          continue;
        }

        if (activeSubjectIdRef.current === requestedSubjectId) {
          setUploadingFile(file.name);
        }

        try {
          // This is a real upload request; opening a subject is not.
          const uploaded = await uploadStudyMaterial(
            requestedSubjectId,
            file,
          );

          current = [...current, { ...uploaded, selected: true }];

          saveCachedMaterials(requestedSubjectId, current);

          if (activeSubjectIdRef.current === requestedSubjectId) {
            setMaterials(current);
          }
        } catch (err) {
          errors.push(`${file.name}: ${errorMessage(err)}`);
        } finally {
          if (activeSubjectIdRef.current === requestedSubjectId) {
            setUploadingFile(null);
          }
        }
      }

      if (
        errors.length > 0 &&
        activeSubjectIdRef.current === requestedSubjectId
      ) {
        setError(errors.join(" "));
      }
    },
    [isLoading, subjectId, uploadingFile],
  );

  const removeMaterial = useCallback(
    async (materialId: string) => {
      const requestedSubjectId = subjectId;

      if (!requestedSubjectId || removingId) return;

      setRemovingId(materialId);
      setError(null);

      try {
        await deleteStudyMaterial(requestedSubjectId, materialId);

        const next = loadCachedMaterials(requestedSubjectId).filter(
          (item) => item.id !== materialId,
        );

        saveCachedMaterials(requestedSubjectId, next);

        if (activeSubjectIdRef.current === requestedSubjectId) {
          setMaterials(next);
        }
      } catch (err) {
        if (activeSubjectIdRef.current === requestedSubjectId) {
          setError(errorMessage(err));
        }
      } finally {
        if (activeSubjectIdRef.current === requestedSubjectId) {
          setRemovingId(null);
        }
      }
    },
    [removingId, subjectId],
  );

  const toggleMaterial = useCallback(
    (materialId: string) => {
      const next = loadCachedMaterials(subjectId).map((item) =>
        item.id === materialId
          ? { ...item, selected: !item.selected }
          : item,
      );

      saveCachedMaterials(subjectId, next);

      if (activeSubjectIdRef.current === subjectId) {
        setMaterials(next);
      }
    },
    [subjectId],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    materials,
    selectedMaterialIds: materials
      .filter((item) => item.selected)
      .map((item) => item.id),
    isLoading,
    uploadingFile,
    isUploading: uploadingFile !== null,
    removingId,
    error,
    addFiles,
    removeMaterial,
    toggleMaterial,
    clearError,
  };
}
