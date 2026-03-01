const express = require("express");
const morgan = require("morgan");
const routes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");
const { httpLogger } = require("./middlewares/logger");
const cors = require("cors");

const app = express();

app.use(httpLogger);

app.use(express.json({ limit: "5mb" }));

app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", routes);

app.use(errorHandler);

module.exports = { app };