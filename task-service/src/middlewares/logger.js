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

module.exports = { logger, httpLogger };
