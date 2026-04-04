const { notFound, conflict } = require("./helpers/serviceErrors");
const {
  normalizeCourseInput,
  normalizeCourseTopics,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
} = require("./helpers/courseValidation");

function createCourseService({ courseRepo, topicRepo }) {
  const normalizeTopicName = (value) => String(value || "").trim().toLowerCase();

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
        const nextTopics = Array.isArray(update.topics) ? update.topics : [];
        const currentTopicSet = new Set(currentTopics.map(normalizeTopicName));
        const nextTopicSet = new Set(nextTopics.map(normalizeTopicName));
        const removedTopics = currentTopics.filter(
          (topicName) => !nextTopicSet.has(normalizeTopicName(topicName)),
        );
        const addedTopics = nextTopics.filter(
          (topicName) => !currentTopicSet.has(normalizeTopicName(topicName)),
        );

        const renamePairs = [];
        if (removedTopics.length === addedTopics.length && removedTopics.length > 0) {
          for (
            let index = 0;
            index < Math.min(currentTopics.length, nextTopics.length);
            index += 1
          ) {
            const previousName = String(currentTopics[index] || "").trim();
            const nextName = String(nextTopics[index] || "").trim();
            if (
              previousName &&
              nextName &&
              previousName !== nextName &&
              removedTopics.some(
                (name) => normalizeTopicName(name) === normalizeTopicName(previousName),
              ) &&
              addedTopics.some(
                (name) => normalizeTopicName(name) === normalizeTopicName(nextName),
              )
            ) {
              renamePairs.push([previousName, nextName]);
            }
          }
        }

        const renamedFromTopics = new Set(
          renamePairs.map(([previousName]) => normalizeTopicName(previousName)),
        );
        const topicsToDelete = removedTopics.filter(
          (topicName) => !renamedFromTopics.has(normalizeTopicName(topicName)),
        );

        await Promise.all(
          [
            ...renamePairs.map(([previousName, nextName]) =>
              topicRepo.renameTopicForCourse(id, previousName, nextName),
            ),
            ...topicsToDelete.map((topicName) =>
              topicRepo.deleteByCourseIdAndTopic(id, topicName),
            ),
          ],
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
