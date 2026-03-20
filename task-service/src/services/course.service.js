const { notFound, conflict } = require("./helpers/serviceErrors");
const {
  normalizeCourseInput,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
} = require("./helpers/courseValidation");

function createCourseService({ courseRepo }) {
  return {
    async createCourse(data) {
      const payload = normalizeCourseInput(data);
      validateCreateCoursePayload(payload);

      const existing = await courseRepo.findByShortName(payload.shortName);
      if (existing) {
        throw conflict("shortName already exists");
      }

      return courseRepo.create(payload);
    },

    async listCourses(query) {
      return courseRepo.findAll(query);
    },

    async getCourse(id) {
      const course = await courseRepo.findById(id);
      if (!course) {
        throw notFound("Course not found");
      }
      return course;
    },

    async updateCourse(id, data) {
      const update = {};

      if (data.title !== undefined) update.title = String(data.title).trim();
      if (data.shortName !== undefined)
        update.shortName = String(data.shortName).trim();
      if (data.coverPage !== undefined)
        update.coverPage = String(data.coverPage).trim();

      validateNonEmptyCourseFields(update);

      const updated = await courseRepo.updateById(id, update);
      if (!updated) {
        throw notFound("Course not found");
      }

      return updated;
    },

    async deleteCourse(id) {
      const deleted = await courseRepo.deleteById(id);
      if (!deleted) {
        throw notFound("Course not found");
      }
      return deleted;
    },
  };
}

module.exports = { createCourseService };
