function buildValidationErrors(errors) {
  return errors.map((entry) => ({
    code: entry.code || null,
    message: entry.message || "",
    details: entry.details,
  }));
}

function buildSingleError(err) {
  const body = {
    code: err.code || null,
    message: err.message || "Internal Server Error",
  };

  if (err.details !== undefined) body.details = err.details;
  return body;
}

module.exports = {
  buildValidationErrors,
  buildSingleError,
};
