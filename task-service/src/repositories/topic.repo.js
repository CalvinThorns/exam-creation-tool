const { Topic } = require("../models/topic.model");

function createTopicRepo() {
  return {
    async create(data) {
      return Topic.create(data);
    },

    async findAll({ page = 1, limit = 20, q = "", courseId }) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const filter = {};

      if (courseId) filter.courseId = courseId;

      if (q) {
        filter.$or = [
          { topic: { $regex: q, $options: "i" } },
          { description: { $regex: q, $options: "i" } },
        ];
      }

      const [items, total] = await Promise.all([
        Topic.find(filter)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Topic.countDocuments(filter),
      ]);

      return { items, total, page: safePage, limit: safeLimit };
    },

    async findById(id) {
      return Topic.findById(id);
    },

    async updateById(id, update) {
      return Topic.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
    },

    async deleteById(id) {
      return Topic.findByIdAndDelete(id);
    },
  };
}

module.exports = { createTopicRepo };
