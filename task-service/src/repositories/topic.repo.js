const { Topic } = require("../models/topic.model");
const { normalizePagination } = require("../utils/pagination");
const { buildTopicSearchFilter } = require("../utils/query");

function createTopicRepo() {
  return {
    async create(data) {
      return Topic.create(data);
    },

    async findAll({ page = 1, limit = 20, q = "", courseId, allowedCourseIds }) {
      const { page: safePage, limit: safeLimit } = normalizePagination(
        page,
        limit,
      );

      const filter = {
        ...buildTopicSearchFilter({ q, courseId }),
        isDeleted: { $ne: true },
      };

      if (allowedCourseIds !== undefined) {
        if (allowedCourseIds.length > 0) {
          filter.courseId = { $in: allowedCourseIds }; 
        } else {
          filter.courseId = { $in: [] }; 
        }
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

    async deleteByCourseId(courseId) {
      return Topic.updateMany(
        { courseId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      );
    },

    async deleteByCourseIdAndTopic(courseId, topic) {
      return Topic.updateMany(
        { courseId, topic, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      );
    },

    async renameTopicForCourse(courseId, fromTopic, toTopic) {
      const docs = await Topic.find({
        courseId,
        topic: fromTopic,
        isDeleted: { $ne: true },
      });

      await Promise.all(
        docs.map((doc) => {
          const rawLatex = String(doc.full_tex_code || "");
          const nextLatex = rawLatex.replace(
            /\\section\{[^}]*\}/,
            `\\section{${toTopic}}`,
          );

          return Topic.updateOne(
            { _id: doc._id },
            {
              $set: {
                topic: toTopic,
                full_tex_code: nextLatex || rawLatex,
              },
            },
          );
        }),
      );
    },
  };
}

module.exports = { createTopicRepo };
