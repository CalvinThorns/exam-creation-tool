import { tasksHttp } from "./clients";

export const coursesApi = {
  list: (params) => tasksHttp.get("/courses", { params }).then((r) => r.data),
  create: (body) => tasksHttp.post("/courses", body).then((r) => r.data),
  update: (id, body) =>
    tasksHttp.patch(`/courses/${id}`, body).then((r) => r.data),
  remove: (id) => tasksHttp.delete(`/courses/${id}`).then((r) => r.data),
};
