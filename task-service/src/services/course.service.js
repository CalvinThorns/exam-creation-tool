function createCourseService({ courseRepo }) {
  return {
    async createCourse(data) {
      const title = String(data.title || "").trim();
      const shortName = String(data.shortName || "").trim();
      const coverPage = String(data.coverPage || "").trim();

      if (!title) {
        const err = new Error("title is required");
        err.status = 400;
        throw err;
      }
      if (!shortName) {
        const err = new Error("shortName is required");
        err.status = 400;
        throw err;
      }
      if (!coverPage) {
        const err = new Error("coverPage is required");
        err.status = 400;
        throw err;
      }

      const existing = await courseRepo.findByShortName(shortName);
      if (existing) {
        const err = new Error("shortName already exists");
        err.status = 409;
        throw err;
      }

      return courseRepo.create({ title, shortName, coverPage });
    },

    async listCourses(query) {
      return courseRepo.findAll(query);
    },

    async getCourse(id) {
      const course = await courseRepo.findById(id);
      if (!course) {
        const err = new Error("Course not found");
        err.status = 404;
        throw err;
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

      if (update.title !== undefined && !update.title) {
        const err = new Error("title cannot be empty");
        err.status = 400;
        throw err;
      }
      if (update.shortName !== undefined && !update.shortName) {
        const err = new Error("shortName cannot be empty");
        err.status = 400;
        throw err;
      }
      if (update.coverPage !== undefined && !update.coverPage) {
        const err = new Error("coverPage cannot be empty");
        err.status = 400;
        throw err;
      }

      const updated = await courseRepo.updateById(id, update);
      if (!updated) {
        const err = new Error("Course not found");
        err.status = 404;
        throw err;
      }

      return updated;
    },

    async deleteCourse(id) {
      const deleted = await courseRepo.deleteById(id);
      if (!deleted) {
        const err = new Error("Course not found");
        err.status = 404;
        throw err;
      }
      return deleted;
    },
  };
}

module.exports = { createCourseService };
