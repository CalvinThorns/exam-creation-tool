import { tasksHttp } from "./clients";

export const topicsApi = {
  list: (params) => tasksHttp.get("/topics", { params }).then((r) => r.data),
  create: (body) => tasksHttp.post("/topics", body).then((r) => r.data),
  update: (id, body) =>
    tasksHttp.patch(`/topics/${id}`, body).then((r) => r.data),
  remove: (id) => tasksHttp.delete(`/topics/${id}`).then((r) => r.data),
};
