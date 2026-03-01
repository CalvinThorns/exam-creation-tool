const { logger } = require("./logger");

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

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

  res.status(status).json({
    error: {
      message: err.message || "Internal Server Error",
      details: err.details,
    },
  });
}

module.exports = { errorHandler };
