import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api", 
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.error?.message || err?.message || "Request failed";
    err.userMessage = msg;
    return Promise.reject(err);
  },
);
