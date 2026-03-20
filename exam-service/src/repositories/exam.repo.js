const { Exam } = require("../models/exam.model");

function createExamRepo() {
  return {
    async create(data) {
      return Exam.create(data);
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort, courseId }) {
      const qfilter = { ...filter };
      if (courseId) qfilter.courseId = courseId;

      const query = Exam.find(qfilter).populate("courseId");
      if (sort && Object.keys(sort).length) {
        query.sort(sort);
      } else {
        query.sort({ createdAt: -1 });
      }

      const [items, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Exam.countDocuments(qfilter),
      ]);

      return { items, total };
    },

    async findById(id) {
      const q = Exam.findById(id).populate("courseId");
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
