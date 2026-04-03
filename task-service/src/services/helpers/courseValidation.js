const { badRequest } = require("./serviceErrors");

function normalizeCourseTopics(topics) {
  if (!Array.isArray(topics)) return [];

  return topics.map((topic) => String(topic || "").trim()).filter(Boolean);
}

function normalizeCourseInput(data) {
  return {
    title: String(data.title || "").trim(),
    shortName: String(data.shortName || "").trim(),
    coverPage: String(data.coverPage || ""),
    topics: normalizeCourseTopics(data.topics),
    creator: data.creator,
  };
}

function validateCreateCoursePayload(payload) {
  if (!payload.title) throw badRequest("title is required");
  if (!payload.shortName) throw badRequest("shortName is required");
  if (!payload.creator) throw badRequest("creator is required");
  validateCourseTopics(payload.topics);
}

function validateNonEmptyCourseFields(update) {
  if (update.title !== undefined && !update.title) {
    throw badRequest("title cannot be empty");
  }
  if (update.shortName !== undefined && !update.shortName) {
    throw badRequest("shortName cannot be empty");
  }
  if (update.topics !== undefined) {
    validateCourseTopics(update.topics);
  }
}

function validateCourseTopics(topics) {
  if (!Array.isArray(topics)) {
    throw badRequest("topics must be an array");
  }

  if (topics.some((topic) => !String(topic || "").trim())) {
    throw badRequest("course topics cannot contain empty values");
  }

  const seen = new Set();
  for (const topic of topics) {
    const normalized = String(topic || "").trim().toLowerCase();
    if (seen.has(normalized)) {
      throw badRequest("course topics must be unique");
    }
    seen.add(normalized);
  }
}

module.exports = {
  normalizeCourseInput,
  normalizeCourseTopics,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
};
