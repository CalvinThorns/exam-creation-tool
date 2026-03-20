const mongoose = require("mongoose");
const crypto = require("crypto");

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

function randomProjectId() {
  return crypto.randomBytes(12).toString("hex");
}

function safeFilename(name) {
  return (
    String(name || "exam")
      .replace(/[^a-z0-9-_]+/gi, "_")
      .slice(0, 60) || "exam"
  );
}

function numOrZero(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumTopicPoints(topics) {
  return (topics || []).reduce((acc, t) => acc + numOrZero(t.points), 0);
}

module.exports = {
  badRequest,
  notFound,
  isValidObjectId,
  randomProjectId,
  safeFilename,
  numOrZero,
  sumTopicPoints,
};
