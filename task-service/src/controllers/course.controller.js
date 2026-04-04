const { buildPaginationMeta } = require("../utils/pagination");
const mongoose = require("mongoose");

function createCourseController({ courseService }) {
  return {
    create: async (req, res, next) => {
      try {
        const creatorId = req.user?.userId || req.user?.id || req.user?._id;

        const course = await courseService.createCourse({
          ...req.body,
          creator: creatorId,
        });
        res.status(201).json({ data: course });
      } catch (err) {
        next(err);
      }
    },

    list: async (req, res, next) => {
      try {
        const result = await courseService.listCourses(req.query, req.user.userId);
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
        const course = await courseService.getCourse(req.params.id, req.user.userId);
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
          req.user.userId 
        );
        res.json({ data: course });
      } catch (err) {
        next(err);
      }
    },

    deleteById: async (req, res, next) => {
      try {
        await courseService.deleteCourse(req.params.id, req.user.userId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
    
    addCollaborator: async (req, res, next) => {
      try {
        const courseId = req.params.id;
        const currentUserId =
          req.user?.userId || req.user?.id || req.user?._id;
        const { email } = req.body;

        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }

        const collaborator = await mongoose.connection.db
          .collection("users")
          .findOne({
            email: email.toLowerCase(),
          });

        if (!collaborator) {
          return res.status(404).json({ error: "User not found" });
        }

        const updatedCourse = await courseService.addCollaborator(
          courseId,
          currentUserId,
          collaborator._id,
        );

        res.json({ data: updatedCourse });
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createCourseController };
