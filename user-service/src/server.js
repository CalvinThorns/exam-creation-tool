const { app } = require("./app");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const { httpLogger, logger } = require("./middlewares/logger");

app.use(httpLogger);

process.on("uncaughtException", (err) => {
  logger.error({ err }, "uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandledRejection");
});
(async () => {
  try {
    await connectDB(env.mongoUri);
    const server = app.listen(env.port, () => {
      console.log(`Server running on http://localhost:${env.port}`);
    });

    // Let long PDF compiles finish
    server.setTimeout(15 * 60 * 1000);
    server.headersTimeout = 16 * 60 * 1000;
    server.requestTimeout = 15 * 60 * 1000;
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
