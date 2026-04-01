import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { examsApi } from "../../api/exams.api";
import i18n from "../../i18n";
import { notifySuccess } from "../../app/notifications";
import { useMemo } from "react";
import {
  validateExamTopics,
  createExamValidationLabel,
} from "./utils/validation";

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
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.examCreated"));
      return qc.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}

export function useUpdateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => examsApi.update(id, body),
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.examUpdated"));
      return qc.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}

export function useDeleteExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: examsApi.remove,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.examDeleted"));
      return qc.invalidateQueries({ queryKey: ["exams"] });
    },
  });
}

export function useGenerateExam() {
  return useMutation({
    mutationFn: examsApi.generate,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.examGenerated"));
    },
  });
}

// NEW: draft generation (no DB write)
export function useGenerateDraft() {
  return useMutation({
    mutationFn: examsApi.draft,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.draftGenerated"));
    },
  });
}

// NEW: regenerate one topic in draft (no DB write)
export function useRegenerateDraftTopic() {
  return useMutation({
    mutationFn: examsApi.regenerateTopic,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.topicRegenerated"));
    },
  });
}

export function useExam(id, options) {
  return useQuery({
    queryKey: ["exams", id],
    queryFn: () => examsApi.getById(id).then((r) => r.data),
    ...options,
  });
}

/**
 * Hook to validate exam points
 * Ensures that for each topic, the sum of task points equals the topic points
 * @param {Object} draft - The exam draft object with topics array
 * @returns {Object} { isValid, errors, invalidTopics, validationLabel }
 */
export function useExamValidation(draft) {
  return useMemo(() => {
    const topicsValidation = validateExamTopics(draft?.topics);
    const validationLabel = createExamValidationLabel(draft);
    const firstError = topicsValidation.firstError;

    return {
      isValid: topicsValidation.isValid,
      errors: topicsValidation.errors,
      invalidTopics: topicsValidation.invalidTopics,
      topicErrors: topicsValidation.topicErrors,
      firstError,
      validationLabel: validationLabel.label,
      hasErrors: !topicsValidation.isValid,
    };
  }, [draft]);
}
