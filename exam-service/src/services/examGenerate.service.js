const mongoose = require("mongoose");
const { Course } = require("../models/course.model");
const { Topic } = require("../models/topic.model");

function createExamGenerateService() {
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

  function normalizeText(s) {
    return String(s || "").trim();
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async function findTopicByName({ courseId, name, mode }) {
    const topicName = normalizeText(name);
    if (!topicName) throw badRequest("Each topic must be a non empty string");

    if (mode === "loose") {
      const pattern = `^${escapeRegex(topicName)}$`;
      return Topic.findOne({
        courseId,
        topic: { $regex: pattern, $options: "i" },
      });
    }

    return Topic.findOne({ courseId, topic: topicName });
  }

  return {
    async generate(payload) {
      const courseId = normalizeText(payload.courseId);
      const topicNames = payload.topics;

      const matchMode = payload.matchMode === "loose" ? "loose" : "exact";

      if (!courseId) throw badRequest("courseId is required");
      if (!isValidObjectId(courseId))
        throw badRequest("courseId must be a valid id");

      if (!Array.isArray(topicNames) || topicNames.length === 0) {
        throw badRequest("topics must be a non empty array of strings");
      }

      const course = await Course.findById(courseId);
      if (!course) throw notFound("Course not found");

      const topics = [];
      for (const name of topicNames) {
        const doc = await findTopicByName({ courseId, name, mode: matchMode });
        if (!doc) {
          const err = new Error(
            `Topic not found in this course: ${normalizeText(name)}`,
          );
          err.status = 404;
          throw err;
        }
        topics.push(doc);
      }

      const totalPoints = topics.reduce(
        (acc, t) => acc + Number(t.points || 0),
        0,
      );

      return {
        course,
        totalPoints,
        topics,
        meta: {
          matchMode,
          topicCount: topics.length,
        },
      };
    },
  };
}

module.exports = { createExamGenerateService };
