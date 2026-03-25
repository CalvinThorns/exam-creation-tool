import { toast } from "react-toastify";

const DEFAULT_OPTIONS = {
  position: "top-right",
  autoClose: 4500,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

export function notify(message, options = {}) {
  if (!message) return;

  const severity = options.severity || "info";
  const toastOptions = {
    ...DEFAULT_OPTIONS,
    autoClose: options.autoHideDuration ?? DEFAULT_OPTIONS.autoClose,
    ...(options.toastOptions || {}),
  };

  if (severity === "success") return toast.success(message, toastOptions);
  if (severity === "error") return toast.error(message, toastOptions);
  if (severity === "warning") return toast.warning(message, toastOptions);
  return toast.info(message, toastOptions);
}

export function notifySuccess(message, options = {}) {
  notify(message, { ...options, severity: "success" });
}

export function notifyError(message, options = {}) {
  notify(message, { ...options, severity: "error" });
}

export function notifyInfo(message, options = {}) {
  notify(message, { ...options, severity: "info" });
}

export function notifyWarning(message, options = {}) {
  notify(message, { ...options, severity: "warning" });
}
