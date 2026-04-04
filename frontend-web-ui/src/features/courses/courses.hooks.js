import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { coursesApi } from "../../api/courses.api";
import i18n from "../../i18n";
import { notifySuccess } from "../../app/notifications";

function buildShortName(title) {
  const normalized = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "course";
}

const toCreateDto = (values) => {
  return {
    title: values.title,
    shortName: buildShortName(values.title),
    coverPage: String(values.coverPage || ""),
    topics: (values.topics || []).map((topic) => String(topic || "").trim()).filter(Boolean),
  };
};

const toUpdateDto = (values) => {
  const dto = {};
  if (values.title) dto.title = values.title;
  if (values.coverPage !== undefined) {
    dto.coverPage = String(values.coverPage || "");
  }
  if (values.topics) {
    dto.topics = values.topics
      .map((topic) => String(topic || "").trim())
      .filter(Boolean);
  }
  return dto;
};

export function useCourses(params) {
  return useQuery({
    queryKey: ["courses", params],
    queryFn: async () => {
      const response = await coursesApi.list(params);
      return response;
    },
  });
}

export function useCourse(id, options) {
  return useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await coursesApi.getById(id);
      return response;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const dto = toCreateDto(values);
      return await coursesApi.create(dto);
    },
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.courseCreated"));
      return queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const dto = toUpdateDto(body);
      return await coursesApi.update(id, dto);
    },
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.courseUpdated"));
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
        queryClient.invalidateQueries({ queryKey: ["topics"] }),
      ]);
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await coursesApi.remove(id);
    },
    onSuccess: () => {
      notifySuccess(i18n.t("notifications.courseDeleted"));
      return queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}
export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, email }) => {
      return await coursesApi.addCollaborator(id, email);
    },
  });
}
