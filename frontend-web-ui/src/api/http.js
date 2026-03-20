import axios from "axios";

export function createHttp({ baseURL, headers } = {}) {
  const client = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_URL || "/api",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg =
        err?.response?.data?.error?.message || err?.message || "Request failed";
      err.userMessage = msg;
      return Promise.reject(err);
    },
  );

  return client;
}
