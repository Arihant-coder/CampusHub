import { useCallback, useEffect, useRef, useState } from "react";
import {
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

// Keep material metadata separately for each subject.
const CACHE_PREFIX = "campushub:study-materials:v1:";

// Memory cache also works when sessionStorage is unavailable.
const materialCache = new Map<string, StudyMaterial[]>();

function cacheKey(subjectId: string): string {
  return `${CACHE_PREFIX}${subjectId}`;
}

function isStudyMaterial(value: unknown): value is StudyMaterial {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    (item.kind === "pdf" || item.kind === "text") &&
    typeof item.mime_type === "string" &&
    typeof item.size_bytes === "number" &&
    typeof item.created_at === "string" &&
    typeof item.selected === "boolean"
  );
}

function loadCachedMaterials(subjectId: string): StudyMaterial[] {
  if (!subjectId) return [];

  const cached = materialCache.get(subjectId);

  if (cached !== undefined) return cached;

  try {
    const raw = window.sessionStorage.getItem(cacheKey(subjectId));

    if (!raw) {
      materialCache.set(subjectId, []);
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    const materials = Array.isArray(parsed)
      ? parsed.filter(isStudyMaterial).slice(0, MAX_STUDY_MATERIALS)
      : [];

    materialCache.set(subjectId, materials);
    return materials;
  } catch {
    return [];
  }
}

function saveCachedMaterials(
  subjectId: string,
  materials: StudyMaterial[],
): void {
  materialCache.set(subjectId, materials);

  try {
    window.sessionStorage.setItem(
      cacheKey(subjectId),
      JSON.stringify(materials),
    );
  } catch {
    // The in-memory cache still works if sessionStorage is unavailable.
  }
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

  const [isLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSubjectIdRef = useRef(subjectId);

  // Restore this subject's cached list, without contacting the backend.
  useEffect(() => {
    activeSubjectIdRef.current = subjectId;
    setMaterials(loadCachedMaterials(subjectId));
    setError(null);
    setUploadingFile(null);
    setRemovingId(null);
  }, [subjectId]);

  const addFiles = useCallback(
    async (files: File[]) => {
      const requestedSubjectId = subjectId;

      if (!requestedSubjectId || uploadingFile) return;

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
    [subjectId, uploadingFile],
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