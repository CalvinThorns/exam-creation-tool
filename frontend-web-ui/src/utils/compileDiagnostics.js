import i18n from "../i18n";
import {
  notifySuccess,
  notifyWarning,
  notifyError,
} from "../app/notifications";

export function normalizeCompileDiagnostics(rawDiagnostics) {
  const diagnostics = rawDiagnostics || {};

  const errorCount = Number(
    diagnostics?.errorCount ?? diagnostics?.errors?.length ?? 0,
  );
  const warningCount = Number(
    diagnostics?.warningCount ?? diagnostics?.warnings?.length ?? 0,
  );

  const outcome =
    diagnostics?.outcome ||
    (errorCount > 0
      ? "success_with_errors"
      : warningCount > 0
        ? "success_with_warnings"
        : "success");

  return {
    outcome,
    clsiStatus: diagnostics?.clsiStatus || null,
    buildId: diagnostics?.buildId || null,
    errorCount,
    warningCount,
    errors: diagnostics?.errors || [],
    warnings: diagnostics?.warnings || [],
    timings: diagnostics?.timings || null,
    stats: diagnostics?.stats || null,
    log: diagnostics?.log || "",
    stdout: diagnostics?.stdout || "",
    stderr: diagnostics?.stderr || "",
  };
}

export function toCompilerMessages(diagnostics) {
  if (!diagnostics) return null;
  return normalizeCompileDiagnostics(diagnostics);
}

export function getCompileResultPayload(response) {
  const payload = response?.data || response || {};
  const diagnostics = normalizeCompileDiagnostics(
    payload?.diagnostics || payload?.errors || null,
  );

  return {
    pdfBase64: payload?.pdfBase64,
    filename: payload?.filename,
    contentType: payload?.contentType || "application/pdf",
    diagnostics,
  };
}

export function notifyCompileOutcome(diagnostics) {
  const resolved = normalizeCompileDiagnostics(diagnostics);

  if (resolved.errorCount > 0) {
    notifyWarning(
      i18n.t("notifications.compileWithErrors", {
        count: resolved.errorCount,
      }),
      { autoHideDuration: 5500 },
    );
    return;
  }

  if (resolved.warningCount > 0) {
    notifyWarning(
      i18n.t("notifications.compileWithWarnings", {
        count: resolved.warningCount,
      }),
      { autoHideDuration: 5000 },
    );
    return;
  }

  notifySuccess(i18n.t("notifications.compileSuccess"));
}

export function notifyCompileRequestFailed(error, fallbackMessage) {
  const message =
    error?.response?.data?.error?.message ||
    error?.userMessage ||
    error?.message ||
    fallbackMessage ||
    i18n.t("errors.requestFailed");

  notifyError(message);
}
