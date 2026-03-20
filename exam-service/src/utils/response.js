const {
  buildValidationErrors,
  buildSingleError,
} = require("./helpers/responseHelpers");

function sendSuccess(res, { data = null, status = 200, meta } = {}) {
  const body = { success: true };
  if (data !== null && data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

function sendError(res, err = {}) {
  const status = err.status || err.statusCode || 500;

  const body = { success: false, error: {} };

  if (Array.isArray(err.errors)) {
    body.error.errors = buildValidationErrors(err.errors);
  } else {
    body.error = buildSingleError(err);
  }

  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };
