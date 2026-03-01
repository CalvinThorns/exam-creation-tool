import { http } from "./http";

export const coursesApi = {
  list: (params) => http.get("/courses", { params }).then((r) => r.data),
  create: (body) => http.post("/courses", body).then((r) => r.data),
  update: (id, body) => http.patch(`/courses/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/courses/${id}`).then((r) => r.data),
};
