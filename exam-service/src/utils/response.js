const {
  buildValidationErrors,
  buildSingleError,
} = require("./helpers/responseHelpers");

function normalizeStatus(value) {
  const status = Number(value);
  if (!Number.isFinite(status)) return 500;
  if (status < 100 || status > 599) return 500;
  return status;
}

function buildMeta(req, status, extraMeta) {
  const baseMeta = {
    timestamp: new Date().toISOString(),
    status,
  };

  if (req) {
    baseMeta.requestId = req.id || null;
    baseMeta.path = req.originalUrl || req.url || null;
    baseMeta.method = req.method || null;
  }

  return {
    ...baseMeta,
    ...(extraMeta || {}),
  };
}

function sendSuccess(res, { req, data = null, status = 200, meta } = {}) {
  const normalizedStatus = normalizeStatus(status);
  const body = {
    success: true,
    meta: buildMeta(req, normalizedStatus, meta),
  };

  if (data !== null && data !== undefined) {
    body.data = data;
  }

  return res.status(normalizedStatus).json(body);
}

function resolveSendErrorArgs(arg1, arg2, arg3) {
  if (arg3 !== undefined) {
    return { req: arg1, res: arg2, err: arg3 };
  }

  return { req: null, res: arg1, err: arg2 };
}

function sendError(arg1, arg2, arg3) {
  const { req, res, err = {} } = resolveSendErrorArgs(arg1, arg2, arg3);
  const status = normalizeStatus(err.status || err.statusCode || 500);
  const isValidation = Array.isArray(err.errors);

  const single = buildSingleError(err, status);

  const errorBody = {
    code: single.code,
    message: single.message,
  };

  if (single.details !== undefined) {
    errorBody.details = single.details;
  }

  if (isValidation) {
    errorBody.issues = buildValidationErrors(err.errors);
  }

  const body = {
    success: false,
    error: errorBody,
    meta: buildMeta(req, status),
  };

  if (isValidation) {
    body.error.errors = errorBody.issues;
  }

  return res.status(status).json(body);
}

module.exports = { sendSuccess, sendError };
