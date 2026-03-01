const mongoose = require("mongoose");

function createTopicService({ topicRepo }) {
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

  function parseImageInput(img, fieldName) {
    // allow empty
    if (img === undefined || img === null || img === "") {
      return { data: null, contentType: "", filename: "" };
    }

    // support already-parsed object { base64, contentType, filename }
    if (typeof img === "object") {
      const base64 = String(img.base64 || "").trim();
      const contentType = String(img.contentType || "").trim();
      const filename = String(img.filename || "").trim();

      if (!base64) {
        return { data: null, contentType: "", filename: "" };
      }

      if (!contentType)
        throw badRequest(
          `${fieldName}.contentType is required when base64 is provided`,
        );

      let buffer;
      try {
        buffer = Buffer.from(base64, "base64");
      } catch {
        throw badRequest(`${fieldName}.base64 is not valid base64`);
      }

      if (!buffer || buffer.length === 0)
        throw badRequest(`${fieldName}.base64 decoded empty`);

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
    if (!Number.isFinite(points) || points < 0)
      throw badRequest("Task points must be a number >= 0");

    const question_img = parseImageInput(raw.question_img, "question_img");

    return {
      question,
      points,
      question_img,
      solution: raw.solution ? String(raw.solution).trim() : "",
      isRelatedToTopic:
        raw.isRelatedToTopic !== undefined
          ? Boolean(raw.isRelatedToTopic)
          : true,
    };
  }

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
