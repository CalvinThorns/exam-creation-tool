const express = require("express");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");
const { httpLogger } = require("./middlewares/logger");
const cors = require("cors");

const app = express();

app.use(cors());

app.use(httpLogger);

app.use(express.json({ limit: "5mb" }));

app.use(morgan("combined"));

const { sendSuccess } = require("./utils/response");

app.get("/health", (_req, res) => sendSuccess(res, { data: { ok: true } }));

app.use("/api", routes);

app.use(errorHandler);

module.exports = { app };
