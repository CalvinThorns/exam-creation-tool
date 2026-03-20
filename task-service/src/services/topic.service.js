const { badRequest, notFound } = require("./helpers/serviceErrors");
const {
  isValidObjectId,
  parseImageInput,
  normalizeTask,
} = require("./helpers/topicValidation");

function createTopicService({ topicRepo }) {
  return {
    async createTopic(data) {
      const courseId = String(data.courseId || "").trim();
      const topic = String(data.topic || "").trim();
      const description =
        data.description !== undefined ? String(data.description).trim() : "";
      const points = Number(data.points);

      if (!courseId) throw badRequest("courseId is required");
      if (!isValidObjectId(courseId))
        throw badRequest("courseId must be a valid id");
      if (!topic) throw badRequest("topic is required");
      if (!Number.isFinite(points) || points < 0)
        throw badRequest("points must be a number >= 0");

      const description_img = parseImageInput(
        data.description_img,
        "description_img",
      );

      let tasks = [];
      if (Array.isArray(data.tasks)) tasks = data.tasks.map(normalizeTask);
      else if (data.tasks !== undefined)
        throw badRequest("tasks must be an array");

      return topicRepo.create({
        courseId,
        topic,
        description,
        points,
        description_img,
        tasks,
      });
    },

    async listTopics(query) {
      const courseId = query.courseId
        ? String(query.courseId).trim()
        : undefined;
      if (courseId && !isValidObjectId(courseId))
        throw badRequest("courseId must be a valid id");
      return topicRepo.findAll({ ...query, courseId });
    },

    async getTopic(id) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      const doc = await topicRepo.findById(id);
      if (!doc) throw notFound("Topic not found");
      return doc;
    },

    async updateTopic(id, data) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      const update = {};

      if (data.courseId !== undefined) {
        const courseId = String(data.courseId).trim();
        if (!courseId) throw badRequest("courseId cannot be empty");
        if (!isValidObjectId(courseId))
          throw badRequest("courseId must be a valid id");
        update.courseId = courseId;
      }

      if (data.topic !== undefined) {
        const t = String(data.topic).trim();
        if (!t) throw badRequest("topic cannot be empty");
        update.topic = t;
      }

      if (data.description !== undefined)
        update.description = String(data.description).trim();

      if (data.points !== undefined) {
        const p = Number(data.points);
        if (!Number.isFinite(p) || p < 0)
          throw badRequest("points must be a number >= 0");
        update.points = p;
      }

      if (data.description_img !== undefined) {
        update.description_img = parseImageInput(
          data.description_img,
          "description_img",
        );
      }

      if (data.tasks !== undefined) {
        if (!Array.isArray(data.tasks))
          throw badRequest("tasks must be an array");
        update.tasks = data.tasks.map(normalizeTask);
      }

      const updated = await topicRepo.updateById(id, update);
      if (!updated) throw notFound("Topic not found");
      return updated;
    },

    async deleteTopic(id) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      const deleted = await topicRepo.deleteById(id);
      if (!deleted) throw notFound("Topic not found");
      return deleted;
    },
  };
}

module.exports = { createTopicService };
