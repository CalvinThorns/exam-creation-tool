const { Course } = require("../models/course.model");
const { normalizePagination } = require("../utils/pagination");
const { buildCourseSearchFilter } = require("../utils/query");

function createCourseRepo() {
  return {
    async create(data) {
      return Course.create(data);
    },

    async findAll({ page = 1, limit = 20, q = "" }) {
      const { page: safePage, limit: safeLimit } = normalizePagination(
        page,
        limit,
      );

      const filter = {
        ...buildCourseSearchFilter(q),
        isDeleted: { $ne: true },
      };

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
      return Course.findOne({ _id: id, isDeleted: { $ne: true } });
    },

    async findByShortName(shortName) {
      return Course.findOne({ shortName, isDeleted: { $ne: true } });
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
