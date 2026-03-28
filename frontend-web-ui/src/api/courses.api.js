import { tasksHttp } from "./clients";
import { toTasksListQuery } from "../utils/listQuery";

export const coursesApi = {
  list: (uiParams) =>
    tasksHttp
      .get("/courses", { params: toTasksListQuery(uiParams) })
      .then((r) => r.data),
  getById: (id) => tasksHttp.get(`/courses/${id}`).then((r) => r.data),
  create: (body) => tasksHttp.post("/courses", body).then((r) => r.data),
  update: (id, body) =>
    tasksHttp.patch(`/courses/${id}`, body).then((r) => r.data),
  remove: (id) => tasksHttp.delete(`/courses/${id}`).then((r) => r.data),
};
