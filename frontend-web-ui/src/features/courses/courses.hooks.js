  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  // import { coursesApi } from "../../api/client";
  import { coursesApi } from "../../api/courses.api";

  const toCreateDto = (values, creatorId) => {
    return {
      title: values.title,
      shortName: values.shortName,
      coverPage: values.coverPage,
      creator: creatorId, 
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
      const storageUser = localStorage.getItem("user");
      const user = storageUser ? JSON.parse(storageUser) : null;
      
      const userId = user?.id || user?._id;

      console.log("Gespeicherter User:", user);
      console.log("Gefundene User-ID:", userId);

      if (!userId) {
        throw new Error("Keine User-ID gefunden. Bitte logge dich neu ein.");
      }

      const dto = toCreateDto(values, userId);
      
      console.log("Payload, der an den Server gesendet wird:", dto);

      return await coursesApi.create(dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
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
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
    });
  }

  export function useDeleteCourse() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id) => {
        return await coursesApi.remove(id);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
    });
  }
export function useAddCollaborator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, email }) => {
      return await coursesApi.addCollaborator(id, email);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["courses"] }),
  });
}
