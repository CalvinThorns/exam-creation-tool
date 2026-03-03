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
    body.error.errors = err.errors.map((e) => ({
      code: e.code || null,
      message: e.message || "",
      details: e.details,
    }));
  } else {
    body.error.code = err.code || null;
    body.error.message = err.message || "Internal Server Error";
    if (err.details !== undefined) body.error.details = err.details;
  }

  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };
