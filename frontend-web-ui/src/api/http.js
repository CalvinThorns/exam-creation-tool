import axios from "axios";
import i18n from "../i18n";
import { notifyError } from "../app/notifications";

function extractApiErrorMessage(err) {
  const data = err?.response?.data;

  const validationIssue =
    data?.error?.issues?.[0]?.message || data?.error?.errors?.[0]?.message;

  return (
    data?.error?.message ||
    data?.message ||
    validationIssue ||
    err?.message ||
    i18n.t("errors.requestFailed")
  );
}

export function createHttp({ baseURL, headers } = {}) {
  const client = axios.create({
    baseURL: baseURL || import.meta.env.VITE_API_URL || "/api",
    headers: { "Content-Type": "application/json", ...(headers || {}) },
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.code === "ERR_CANCELED") {
        return Promise.reject(err);
      }

      const msg = extractApiErrorMessage(err);

      err.userMessage = msg;
      err.apiError = err?.response?.data?.error || null;
      err.apiMeta = err?.response?.data?.meta || null;

      const shouldNotify = !err?.config?.skipGlobalErrorNotification;
      if (shouldNotify) {
        notifyError(msg);
      }

      return Promise.reject(err);
    },
  );

  return client;
}
