import { useQuery } from "@tanstack/react-query";
import { usersApi } from "../../api/users.api";

export function useUsers(params) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: async () => {
      const response = await usersApi.list(params);
      return response;
    },
  });
}

export function useUser(id, options) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const response = await usersApi.getById(id);
      return response;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
  });
}
