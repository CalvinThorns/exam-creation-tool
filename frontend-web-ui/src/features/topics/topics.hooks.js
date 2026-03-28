import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { topicsApi } from "../../api/topics.api";
import i18n from "../../i18n";
import { notifySuccess } from "../../app/notifications";

export function useTopics(params) {
  return useQuery({
    queryKey: ["topics", params],
    queryFn: () => topicsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useTopic(id, options) {
  return useQuery({
    queryKey: ["topic", id],
    queryFn: () => topicsApi.getById(id),
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.create,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.topicCreated"));
      return qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => topicsApi.update(id, body),
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.topicUpdated"));
      return qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.remove,
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.topicDeleted"));
      return qc.invalidateQueries({ queryKey: ["topics"] });
    },
  });
}
