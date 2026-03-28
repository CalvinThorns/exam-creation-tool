import { usersHttp } from "./clients";

export const usersApi = {
  register: (body) =>
    usersHttp.post("/users/register", body).then((r) => r.data),
  login: (body) => usersHttp.post("/users/login", body).then((r) => r.data),
  resetPassword: (body) =>
    usersHttp.post("/users/reset-password", body).then((r) => r.data),
};
