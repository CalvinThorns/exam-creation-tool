const { notFound, conflict, forbidden } = require("./helpers/serviceErrors");
const {
  normalizeCourseInput,
  validateCreateCoursePayload,
  validateNonEmptyCourseFields,
} = require("./helpers/courseValidation");

function createCourseService({ courseRepo }) {
  const checkAccess = (course, userId) => {
    const isCreator = String(course.creator) === String(userId);
    const isCollaborator = course.collaborators.some(cId => String(cId) === String(userId));
    
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
      if (data.shortName !== undefined) update.shortName = String(data.shortName).trim();
      if (data.coverPage !== undefined) update.coverPage = String(data.coverPage).trim();

      validateNonEmptyCourseFields(update);

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

      return courseRepo.deleteById(id);
    },

    async addCollaborator(id, userId, newCollaboratorId) {
      const course = await courseRepo.findById(id);
      if (!course || course.isDeleted) throw notFound("Course not found");

      checkAccess(course, userId);

      const alreadyIn = course.collaborators.some(cId => String(cId) === String(newCollaboratorId));
      const isCreator = String(course.creator) === String(newCollaboratorId);

      if (!alreadyIn && !isCreator) {
        return courseRepo.addCollaborator(id, newCollaboratorId);
      }
      return course;
    }
  };
}

module.exports = { createCourseService };