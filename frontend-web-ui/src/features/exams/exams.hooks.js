import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { examsApi } from "../../api/exams.api";

export function useExams(params) {
  return useQuery({
    queryKey: ["exams", params],
    queryFn: () => examsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }),
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => examsApi.update(id, body),
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

export function useExam(id, options) {
  return useQuery({
    queryKey: ["exams", id],
    queryFn: () => examsApi.getById(id).then((r) => r.data),
    ...options,
  });
}
