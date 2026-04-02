const mongoose = require("mongoose");
const { logger } = require("./logger");
const { sendError } = require("../utils/response");

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    err.status = 400;
    err.code = "INVALID_JSON";
    err.message = "Invalid JSON payload";
  }

  if (err.name === "CastError" || err instanceof mongoose.Error.CastError) {
    err.status = 400;
    err.code = "INVALID_FIELD_VALUE";
    err.message = `Invalid value for field ${err.path}`;
  }

  if (
    err.name === "ValidationError" &&
    err instanceof mongoose.Error.ValidationError
  ) {
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    err.errors = Object.values(err.errors).map((e) => ({
      code: "VALIDATION_ERROR",
      message: e.message,
      path: e.path,
      kind: e.kind,
    }));
    err.message = "Validation failed";
  }

  if (err?.name === "MongoServerError" && err?.code === 11000) {
    err.status = 409;
    err.code = "DUPLICATE_KEY";
    err.message = "Duplicate key error";
  }

  const rawStatus = Number(err.status || err.statusCode || 500);
  let status =
    Number.isFinite(rawStatus) && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : 500;
  err.status = status;

  logger.error(
    {
      reqId: req.id,
      status,
      method: req.method,
      path: req.originalUrl,
      code: err.code,
      message: err.message,
      details: err.details,
      stack: err.stack,
    },
    "API error",
  );

  if (status >= 500) {
    const safe = new Error("Internal Server Error");
    safe.status = 500;
    safe.code = "INTERNAL_SERVER_ERROR";
    return sendError(req, res, safe);
  }

  return sendError(req, res, err);
}

module.exports = { errorHandler };
