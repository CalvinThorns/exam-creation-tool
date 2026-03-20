const { Course } = require("../models/course.model");
const { applySort } = require("./helpers/queryHelpers");

function createCourseRepo() {
  return {
    async findById(id) {
      return Course.findOne({ _id: id, isDeleted: { $ne: true } });
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort } = {}) {
      const qfilter = { ...filter, isDeleted: { $ne: true } };
      const query = Course.find(qfilter);
      applySort(query, sort);

      const [items, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Course.countDocuments(qfilter),
      ]);

      return { items, total };
    },

    async create(data) {
      return Course.create(data);
    },

    async updateById(id, update) {
      return Course.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        update,
        {
          new: true,
          runValidators: true,
        },
      );
    },

    async deleteById(id) {
      return Course.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { isDeleted: true },
        { new: true },
      );
    },
  };
}

module.exports = { createCourseRepo };
