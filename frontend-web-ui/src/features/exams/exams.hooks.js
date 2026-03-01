import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { examsApi } from "../../api/exams.api";

export function useExams(params) {
  return useQuery({
    queryKey: ["exams", params],
    queryFn: () => examsApi.list(params),
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useGenerateExam() {
  return useMutation({
    mutationFn: examsApi.generate,
  });
}

// NEW: draft generation (no DB write)
export function useGenerateDraft() {
  return useMutation({
    mutationFn: examsApi.draft,
  });
}

// NEW: regenerate one topic in draft (no DB write)
export function useRegenerateDraftTopic() {
  return useMutation({
    mutationFn: examsApi.regenerateTopic,
  });
}
