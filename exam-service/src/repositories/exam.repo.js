const { Exam } = require("../models/exam.model");

function createExamRepo() {
  return {
    async create(data) {
      return Exam.create(data);
    },

    async findAll({ page = 1, limit = 20, courseId }) {
      const safePage = Math.max(1, Number(page) || 1);
      const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

      const filter = {};
      if (courseId) filter.courseId = courseId;

      const [items, total] = await Promise.all([
        Exam.find(filter)
          .sort({ createdAt: -1 })
          .skip((safePage - 1) * safeLimit)
          .limit(safeLimit),
        Exam.countDocuments(filter),
      ]);

      return { items, total, page: safePage, limit: safeLimit };
    },

    async findById(id, { populateTopics = false } = {}) {
      const q = Exam.findById(id);
      if (populateTopics) q.populate("topics");
      return q;
    },

    async updateById(id, update) {
      return Exam.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      });
    },

    async deleteById(id) {
      return Exam.findByIdAndDelete(id);
    },
  };
}

module.exports = { createExamRepo };
