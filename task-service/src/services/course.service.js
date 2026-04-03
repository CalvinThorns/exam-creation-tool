const { notFound, conflict } = require("./helpers/serviceErrors");
const {
  normalizeCourseInput,
  normalizeCourseTopics,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
} = require("./helpers/courseValidation");

function createCourseService({ courseRepo, topicRepo }) {
  const checkAccess = (course, userId) => {
    const isCreator = String(course.creator) === String(userId);
    const collaborators = Array.isArray(course.collaborators)
      ? course.collaborators
      : [];
    const isCollaborator = collaborators.some(
      (collaboratorId) => String(collaboratorId) === String(userId),
    );

    if (!isCreator && !isCollaborator) {
      throw notFound("Course not found");
    }

    return { isCreator, isCollaborator };
  };

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

    async listCourses(query, userId) {
      return courseRepo.findAllForUser(query, userId);
    },

    async getCourse(id, userId) {
      const course = await courseRepo.findById(id);
      if (!course || course.isDeleted) {
        throw notFound("Course not found");
      }

      checkAccess(course, userId);
      return course;
    },

    async updateCourse(id, data, userId) {
      const course = await courseRepo.findById(id);
      if (!course || course.isDeleted) {
        throw notFound("Course not found");
      }

      checkAccess(course, userId);

      const update = {};
      if (data.title !== undefined) update.title = String(data.title).trim();
      if (data.shortName !== undefined) {
        update.shortName = String(data.shortName).trim();
      }
      if (data.coverPage !== undefined) {
        update.coverPage = String(data.coverPage || "");
      }
      if (data.topics !== undefined) {
        update.topics = normalizeCourseTopics(data.topics);
      }

      validateNonEmptyCourseFields(update);

      if (
        update.shortName &&
        update.shortName !== course.shortName
      ) {
        const existing = await courseRepo.findByShortName(update.shortName);
        if (existing && String(existing._id) !== String(course._id)) {
          throw conflict("shortName already exists");
        }
      }

      if (update.topics) {
        const currentTopics = Array.isArray(course.topics) ? course.topics : [];
        const renamePairs = [];

        for (
          let index = 0;
          index < Math.min(currentTopics.length, update.topics.length);
          index += 1
        ) {
          const previousName = String(currentTopics[index] || "").trim();
          const nextName = String(update.topics[index] || "").trim();
          if (previousName && nextName && previousName !== nextName) {
            renamePairs.push([previousName, nextName]);
          }
        }

        await Promise.all(
          renamePairs.map(([previousName, nextName]) =>
            topicRepo.renameTopicForCourse(id, previousName, nextName),
          ),
        );
      }

      const updated = await courseRepo.updateById(id, update);
      return updated;
    },

    async deleteCourse(id, userId) {
      const course = await courseRepo.findById(id);
      if (!course || course.isDeleted) {
        throw notFound("Course not found");
      }

      if (String(course.creator) !== String(userId)) {
        throw notFound("Course not found");
      }

      await topicRepo.deleteByCourseId(id);
      return courseRepo.deleteById(id);
    },

    async addCollaborator(id, userId, newCollaboratorId) {
      const course = await courseRepo.findById(id);
      if (!course || course.isDeleted) throw notFound("Course not found");

      checkAccess(course, userId);

      const alreadyIn = (course.collaborators || []).some(
        (collaboratorId) => String(collaboratorId) === String(newCollaboratorId),
      );
      const isCreator = String(course.creator) === String(newCollaboratorId);

      if (!alreadyIn && !isCreator) {
        return courseRepo.addCollaborator(id, newCollaboratorId);
      }
      return course;
    },
  };
}

module.exports = { createCourseService };
