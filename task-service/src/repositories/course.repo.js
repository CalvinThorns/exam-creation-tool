const { Course } = require("../models/course.model");

function createCourseRepo() {
  return {
    async create(data) {
      return Course.create(data);
    },

    async findAll({ page = 1, limit = 20, q = "" }) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const filter = q
        ? {
            $or: [
              { title: { $regex: q, $options: "i" } },
              { shortName: { $regex: q, $options: "i" } },
            ],
          }
        : {};

      const [items, total] = await Promise.all([
        Course.find(filter)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Course.countDocuments(filter),
      ]);

      return { items, total, page: safePage, limit: safeLimit };
    },

    async findById(id) {
      return Course.findById(id);
    },

    async findByShortName(shortName) {
      return Course.findOne({ shortName });
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
