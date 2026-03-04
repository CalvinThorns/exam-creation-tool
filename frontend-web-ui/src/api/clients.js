// src/api/clients.js
import { createHttp } from "./http";

export const coreHttp = createHttp({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export const examsHttp = createHttp({
  baseURL:
    import.meta.env.VITE_EXAMS_API_URL ||
    import.meta.env.VITE_API_URL ||
    "/api",
});

export const tasksHttp = createHttp({
  baseURL:
    import.meta.env.VITE_TASKS_API_URL ||
    import.meta.env.VITE_API_URL ||
    "/api",
});
