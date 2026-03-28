function buildValidationErrors(errors) {
  return errors.map((entry) => ({
    code: entry.code || "VALIDATION_ERROR",
    message: entry.message || "",
    field: entry.path || entry.field || null,
    kind: entry.kind || null,
    details: entry.details,
  }));
}

function inferErrorCode(status) {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "UNPROCESSABLE_ENTITY";
  if (status >= 500) return "INTERNAL_SERVER_ERROR";
  return "REQUEST_ERROR";
}

function buildSingleError(err, status = 500) {
  const body = {
    code: err.code || inferErrorCode(status),
    message: err.message || "Internal Server Error",
  };

  if (err.details !== undefined) body.details = err.details;
  return body;
}

module.exports = {
  buildValidationErrors,
  buildSingleError,
};
