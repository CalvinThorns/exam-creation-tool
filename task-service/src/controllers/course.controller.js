const { buildPaginationMeta } = require("../utils/pagination");

function createCourseController({ courseService }) {
  return {
    create: async (req, res, next) => {
      try {
        const course = await courseService.createCourse(req.body);
        res.status(201).json({ data: course });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await courseService.listCourses(req.query);
        const meta = buildPaginationMeta(result);
        res.json({
          data: result.items,
          meta,
        });
      } catch (err) {
        next(err);
      }
    },

    getById: async (req, res, next) => {
      try {
        const course = await courseService.getCourse(req.params.id);
        res.json({ data: course });
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
        res.json({ data: course });
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
