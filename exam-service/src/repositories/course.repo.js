const { Course } = require("../models/course.model");

function createCourseRepo() {
  return {
    async findById(id) {
      const q = Course.findById(id);
      return q;
    },
  };
}
module.exports = { createCourseRepo };
