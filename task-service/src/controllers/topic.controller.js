const { sendSuccess } = require("../utils/response");

function createTopicController({ topicService }) {
  return {
    create: async (req, res, next) => {
      try {
        const topic = await topicService.createTopic(req.body);
        return sendSuccess(res, { req, data: topic, status: 201 });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await topicService.listTopics(req.query);
        const { items, ...meta } = result;
        return sendSuccess(res, {
          req,
          data: items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const topic = await topicService.getTopic(req.params.id);
        return sendSuccess(res, { req, data: topic });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const topic = await topicService.updateTopic(req.params.id, req.body);
        return sendSuccess(res, { req, data: topic });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await topicService.deleteTopic(req.params.id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createTopicController };
