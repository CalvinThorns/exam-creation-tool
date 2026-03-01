import { http } from "./http";

export const examsApi = {
  list: (params) => http.get("/exams", { params }).then((r) => r.data),
  create: (body) => http.post("/exams", body).then((r) => r.data),
  update: (id, body) => http.patch(`/exams/${id}`, body).then((r) => r.data),
  remove: (id) => http.delete(`/exams/${id}`).then((r) => r.data),

  // NEW draft endpoints
  draft: (body) => http.post("/exams/draft", body).then((r) => r.data),
  regenerateTopic: (body) =>
    http.post("/exams/draft/regenerate-topic", body).then((r) => r.data),

  compileDraft: (body) =>
    http
      .post("/exams/draft/compile", body, {
        responseType: "blob",
        timeout: 600000,
      })
      .then((r) => r.data),
};
