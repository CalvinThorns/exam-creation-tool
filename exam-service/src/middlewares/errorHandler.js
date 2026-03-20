const mongoose = require("mongoose");
const { logger } = require("./logger");
const { sendError } = require("../utils/response");

function errorHandler(err, req, res, next) {
  if (err.name === "CastError" || err instanceof mongoose.Error.CastError) {
    err.status = 400;
    err.message = `Invalid value for field ${err.path}`;
  }

  if (
    err.name === "ValidationError" &&
    err instanceof mongoose.Error.ValidationError
  ) {
    err.status = 400;
    err.errors = Object.values(err.errors).map((e) => ({
      message: e.message,
      path: e.path,
      kind: e.kind,
    }));
    err.message = "Validation failed";
  }

  let status = err.status || err.statusCode || 500;

  logger.error(
    {
      reqId: req.id,
      status,
      message: err.message,
      details: err.details,
      stack: err.stack,
    },
    "API error",
  );

  if (status >= 500) {
    const safe = new Error("Internal Server Error");
    safe.status = 500;
    return sendError(res, safe);
  }

  return sendError(res, err);
}

module.exports = { errorHandler };
