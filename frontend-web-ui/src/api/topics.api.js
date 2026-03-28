import { tasksHttp } from "./clients";
import { toTasksListQuery } from "../utils/listQuery";

export const topicsApi = {
  list: (uiParams) =>
    tasksHttp
      .get("/topics", { params: toTasksListQuery(uiParams) })
      .then((r) => r.data),
  getById: (id) => tasksHttp.get(`/topics/${id}`).then((r) => r.data),
  create: (body) => tasksHttp.post("/topics", body).then((r) => r.data),
  update: (id, body) =>
    tasksHttp.patch(`/topics/${id}`, body).then((r) => r.data),
  remove: (id) => tasksHttp.delete(`/topics/${id}`).then((r) => r.data),
};
