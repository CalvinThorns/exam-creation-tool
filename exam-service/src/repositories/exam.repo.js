const { Exam } = require("../models/exam.model");
const { applySort } = require("./helpers/queryHelpers");

function createExamRepo() {
  return {
    async create(data) {
      return Exam.create(data);
    },

    async findAll({ page = 1, limit = 20, filter = {}, sort, courseId }) {
      const qfilter = { ...filter, isDeleted: { $ne: true } };
      if (courseId) qfilter.courseId = courseId;

      const query = Exam.find(qfilter).populate("courseId");
      applySort(query, sort);

      const [items, total] = await Promise.all([
        query.skip((page - 1) * limit).limit(limit),
        Exam.countDocuments(qfilter),
      ]);

      return { items, total };
    },

    async findById(id) {
      const q = Exam.findOne({ _id: id, isDeleted: { $ne: true } }).populate(
        "courseId",
      );
      return q;
    },

    async updateById(id, update) {
      return Exam.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        update,
        {
          new: true,
          runValidators: true,
        },
      );
    },

    async deleteById(id) {
      return Exam.findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        { isDeleted: true },
        { new: true },
      );
    },
  };
}

module.exports = { createExamRepo };
