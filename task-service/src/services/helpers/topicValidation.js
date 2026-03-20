const mongoose = require("mongoose");
const { badRequest } = require("./serviceErrors");

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(String(id));
}

function parseImageInput(img, fieldName) {
  if (img === undefined || img === null || img === "") {
    return { data: null, contentType: "", filename: "" };
  }

  if (typeof img === "object") {
    const base64 = String(img.base64 || "").trim();
    const contentType = String(img.contentType || "").trim();
    const filename = String(img.filename || "").trim();

    if (!base64) {
      return { data: null, contentType: "", filename: "" };
    }

    if (!contentType) {
      throw badRequest(
        `${fieldName}.contentType is required when base64 is provided`,
      );
    }

    let buffer;
    try {
      buffer = Buffer.from(base64, "base64");
    } catch {
      throw badRequest(`${fieldName}.base64 is not valid base64`);
    }

    if (!buffer || buffer.length === 0) {
      throw badRequest(`${fieldName}.base64 decoded empty`);
    }

    return { data: buffer, contentType, filename };
  }

  throw badRequest(
    `${fieldName} must be an object { base64, contentType, filename } or empty`,
  );
}

function normalizeTask(raw) {
  const question = String(raw.question || "").trim();
  const points = Number(raw.points);

  if (!question) throw badRequest("Task question is required");
  if (!Number.isFinite(points) || points < 0) {
    throw badRequest("Task points must be a number >= 0");
  }

  const question_img = parseImageInput(raw.question_img, "question_img");

  return {
    question,
    points,
    question_img,
    solution: raw.solution ? String(raw.solution).trim() : "",
    isRelatedToTopic:
      raw.isRelatedToTopic !== undefined ? Boolean(raw.isRelatedToTopic) : true,
  };
}

module.exports = {
  isValidObjectId,
  parseImageInput,
  normalizeTask,
};
