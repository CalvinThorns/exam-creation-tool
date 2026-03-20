const { badRequest } = require("./serviceErrors");

function normalizeCourseInput(data) {
  return {
    title: String(data.title || "").trim(),
    shortName: String(data.shortName || "").trim(),
    coverPage: String(data.coverPage || "").trim(),
  };
}

function validateCreateCoursePayload(payload) {
  if (!payload.title) throw badRequest("title is required");
  if (!payload.shortName) throw badRequest("shortName is required");
  if (!payload.coverPage) throw badRequest("coverPage is required");
}

function validateNonEmptyCourseFields(update) {
  if (update.title !== undefined && !update.title) {
    throw badRequest("title cannot be empty");
  }
  if (update.shortName !== undefined && !update.shortName) {
    throw badRequest("shortName cannot be empty");
  }
  if (update.coverPage !== undefined && !update.coverPage) {
    throw badRequest("coverPage cannot be empty");
  }
}

module.exports = {
  normalizeCourseInput,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
};
