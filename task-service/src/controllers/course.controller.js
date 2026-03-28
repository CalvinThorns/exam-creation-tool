const { sendSuccess } = require("../utils/response");

function createCourseController({ courseService }) {
  return {
    create: async (req, res, next) => {
      try {
        const course = await courseService.createCourse(req.body);
        return sendSuccess(res, { req, data: course, status: 201 });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await courseService.listCourses(req.query);
        const { items, ...meta } = result;
        return sendSuccess(res, {
          req,
          data: items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const course = await courseService.getCourse(req.params.id);
        return sendSuccess(res, { req, data: course });
      } catch (err) {
        next(err);
      }
    },

    updateById: async (req, res, next) => {
      try {
        const course = await courseService.updateCourse(
          req.params.id,
          req.body,
        );
        return sendSuccess(res, { req, data: course });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await courseService.deleteCourse(req.params.id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createCourseController };
