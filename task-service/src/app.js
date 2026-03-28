const express = require("express");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");
const { httpLogger } = require("./middlewares/logger");
const cors = require("cors");
const { sendSuccess, sendError } = require("./utils/response");

const app = express();

app.use(cors());

app.use(httpLogger);

app.use(express.json({ limit: "5mb" }));

app.use(morgan("combined"));

app.get("/health", (req, res) =>
  sendSuccess(res, {
    req,
    data: { ok: true },
    meta: { service: "task-service" },
  }),
);

app.use("/api", routes);

app.use("/api", (req, res) => {
  return sendError(req, res, {
    status: 404,
    code: "NOT_FOUND",
    message: "API route not found",
  });
});

app.use(errorHandler);

module.exports = { app };
