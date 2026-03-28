const { Topic } = require("../models/topic.model");
const { applySort } = require("./helpers/queryHelpers");

function createTopicRepo() {
  return {
    async create(data) {
      return Topic.create(data);
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort }) {
      const qfilter = { ...filter, isDeleted: { $ne: true } };
      const query = Topic.find(qfilter);
      applySort(query, sort);

      const [items, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Topic.countDocuments(qfilter),
      ]);

      return { items, total };
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
