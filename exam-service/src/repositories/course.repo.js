const { Course } = require("../models/course.model");

function createCourseRepo() {
  return {
    async findById(id) {
      return Course.findById(id);
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort } = {}) {
      const query = Course.find(filter);
      if (sort && Object.keys(sort).length) {
        query.sort(sort);
      } else {
        query.sort({ createdAt: -1 });
      }

      const [items, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Course.countDocuments(filter),
      ]);

      return { items, total };
    },

    async create(data) {
      return Course.create(data);
    },

    async updateById(id, update) {
      return Course.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
    },

    async deleteById(id) {
      return Course.findByIdAndDelete(id);
    },
  };
}

module.exports = { createCourseRepo };
