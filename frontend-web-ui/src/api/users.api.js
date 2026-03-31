import { usersHttp } from "./clients";
import { toExamsListQuery } from "../utils/listQuery";

export const usersApi = {
  register: (body) =>
    usersHttp.post("/auth/register", body).then((r) => r.data),
  login: (body) => usersHttp.post("/auth/login", body).then((r) => r.data),
  resetPassword: (body) =>
    usersHttp.post("/auth/reset-password", body).then((r) => r.data),

  list: (params) =>
    usersHttp
      .get("/users", { params: toExamsListQuery(params) })
      .then((r) => r.data),
  getById: (id) => usersHttp.get(`/users/${id}`).then((r) => r.data),
};
