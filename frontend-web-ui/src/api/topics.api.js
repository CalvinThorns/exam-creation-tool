import { http } from "./http";

export const topicsApi = {
  list: (params) => http.get("/topics", { params }).then((r) => r.data),
  create: (body) => http.post("/topics", body).then((r) => r.data),
  update: (id, body) => http.patch(`/topics/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/topics/${id}`).then((r) => r.data),
};
