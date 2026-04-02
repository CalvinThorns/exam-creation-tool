// src/api/clients.js
import { createHttp } from "./http";

const withAuth = (instance) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return instance;
};

// 1. Core API (Allgemein)
export const coreHttp = withAuth(createHttp({
  baseURL: import.meta.env.VITE_API_URL || "/api",
}));

// 2. Exams Service
export const examsHttp = withAuth(createHttp({
  baseURL:
    import.meta.env.VITE_EXAMS_API_URL ||
    "/api/exams",
}));

// 3. Tasks Service (Kurse & Themen)
export const tasksHttp = withAuth(createHttp({
  baseURL:
    import.meta.env.VITE_TASKS_API_URL ||
    import.meta.env.VITE_API_URL ||
    "/api",
}));