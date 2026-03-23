import axios from "axios";
import i18n from "../i18n";

export function createHttp({ baseURL, headers } = {}) {
  const client = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_URL || "/api",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        i18n.t("errors.requestFailed");
      err.userMessage = msg;
      return Promise.reject(err);
    },
  );

  return client;
}
