import { toExamsListQuery } from "../utils/listQuery";
import { examsHttp } from "./clients";

export const examsApi = {
  list: (uiParams) =>
    examsHttp
      .get("", { params: toExamsListQuery(uiParams) })
      .then((r) => r.data),

  create: (body) => examsHttp.post("/", body).then((r) => r.data),
  update: (id, body) => examsHttp.patch(`/${id}`, body).then((r) => r.data),
  remove: (id) => examsHttp.delete(`/${id}`).then((r) => r.data),

  draft: (body) => examsHttp.post("/draft", body).then((r) => r.data),
  regenerateTopic: (body) =>
    examsHttp.post("/draft/regenerate-topic", body).then((r) => r.data),

  compileDraft: (body) =>
    examsHttp
      .post("/draft/compile", body, { timeout: 600000 })
      .then((r) => r.data),
};
