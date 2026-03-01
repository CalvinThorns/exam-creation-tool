import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { topicsApi } from "../../api/topics.api";

export function useTopics(params) {
  return useQuery({
    queryKey: ["topics", params],
    queryFn: () => topicsApi.list(params),
  });
}

export function useCreateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => topicsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: topicsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}
