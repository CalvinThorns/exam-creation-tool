import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import { coursesApi } from "../../api/client";
import { coursesApi } from "../../api/courses.api";

const toCreateDto = (values) => {
  return {
    title: values.title,
    shortName: values.shortName,
    coverPage: values.coverPage,
  };
};

const toUpdateDto = (values) => {
  const dto = {};
  if (values.title) dto.title = values.title;
  if (values.shortName) dto.shortName = values.shortName;
  if (values.coverPage) dto.coverPage = values.coverPage;
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

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const dto = toCreateDto(values);
      return await coursesApi.createCourse(dto);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) => {
      const dto = toUpdateDto(body);
      return await coursesApi.updateCourse(id, dto);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      return await coursesApi.deleteCourse(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}
