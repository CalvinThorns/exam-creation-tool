const pino = require("pino");
const pinoHttp = require("pino-http");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers["x-request-id"] || undefined,
});

function safeHttpLogger(req, res, next) {
  try {
    httpLogger(req, res, (err) => {
      if (err) {
        logger.error({ err }, "httpLogger internal error");
      }
      next();
    });
  } catch (err) {
    logger.error({ err }, "httpLogger threw synchronously");
    next();
  }
}

module.exports = { logger, httpLogger: safeHttpLogger };
