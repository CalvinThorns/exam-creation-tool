const { buildPaginationMeta } = require("../utils/pagination");

function createTopicController({ topicService }) {
  return {
    create: async (req, res, next) => {
      try {
        const topic = await topicService.createTopic(req.body);
        res.status(201).json({ data: topic });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await topicService.listTopics(req.query);
        const meta = buildPaginationMeta(result);
        res.json({
          data: result.items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const topic = await topicService.getTopic(req.params.id);
        res.json({ data: topic });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const topic = await topicService.updateTopic(req.params.id, req.body);
        res.json({ data: topic });
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
