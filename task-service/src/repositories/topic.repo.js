const { Topic } = require("../models/topic.model");
const { normalizePagination } = require("../utils/pagination");
const { buildTopicSearchFilter } = require("../utils/query");

function createTopicRepo() {
  return {
    async create(data) {
      return Topic.create(data);
    },

    async findAll({ page = 1, limit = 20, q = "", courseId }) {
      const { page: safePage, limit: safeLimit } = normalizePagination(
        page,
        limit,
      );

      const filter = {
        ...buildTopicSearchFilter({ q, courseId }),
        isDeleted: { $ne: true },
      };

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
      return Topic.findOne({ _id: id, isDeleted: { $ne: true } });
    },

    async updateById(id, update) {
      return Topic.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        update,
        {
          new: true,
          runValidators: true,
        },
      );
    },

    async deleteById(id) {
      return Topic.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { isDeleted: true },
        { new: true },
      );
    },
  };
}

module.exports = { createTopicRepo };
