const { badRequest, notFound, forbidden } = require("./helpers/serviceErrors");
const {
  isValidObjectId,
  parseImageInput,
  normalizeTask,
} = require("./helpers/topicValidation");

function createTopicService({ topicRepo, courseRepo }) { 
  
  const checkCourseAccess = async (courseId, userId) => {
    if (!courseId) throw badRequest("courseId is required");
    
    console.log(`[DEBUG] checkCourseAccess gestartet | courseId: ${courseId} | userId: ${userId}`);

    const course = await courseRepo.findById(courseId);
    
    if (!course || course.isDeleted) {
      console.log("[DEBUG] FEHLER: Kurs existiert nicht in der Datenbank!");
      throw notFound("Course not found"); 
    }

    console.log(`[DEBUG] Kurs gefunden. Creator: ${course.creator}, Collaborators: ${course.collaborators}`);
    
    const isCreator = String(course.creator) === String(userId);
    const collabs = course.collaborators || []; 
    const isCollaborator = collabs.some(cId => String(cId) === String(userId));

    if (!isCreator && !isCollaborator) {
      console.log("[DEBUG] FEHLER: Zugriff verweigert. User ist weder Creator noch Collaborator.");
      throw forbidden("Access denied for this course"); 
    }
    
    console.log("[DEBUG] Zugriff erfolgreich gewährt!");
  };

  return {
    async createTopic(data, userId) {
      const courseId = String(data.courseId || "").trim();
      
      await checkCourseAccess(courseId, userId);

      const topic = String(data.topic || "").trim();
      const description = data.description !== undefined ? String(data.description).trim() : "";
      const points = Number(data.points);

      if (!courseId) throw badRequest("courseId is required");
      if (!isValidObjectId(courseId)) throw badRequest("courseId must be a valid id");
      if (!topic) throw badRequest("topic is required");
      if (!Number.isFinite(points) || points < 0) throw badRequest("points must be a number >= 0");

      const description_img = parseImageInput(data.description_img, "description_img");

      let tasks = [];
      if (Array.isArray(data.tasks)) tasks = data.tasks.map(normalizeTask);
      else if (data.tasks !== undefined) throw badRequest("tasks must be an array");

      return topicRepo.create({
        courseId,
        topic,
        description,
        points,
        description_img,
        tasks,
      });
    },

    async listTopics(query, userId) {
      const courseId = query.courseId ? String(query.courseId).trim() : undefined;
      
      if (courseId) {
        if (!isValidObjectId(courseId)) throw badRequest("courseId must be a valid id");
        await checkCourseAccess(courseId, userId);
        return topicRepo.findAll({ ...query, courseId });
      } else {
        const userCourses = await courseRepo.findAllForUser({ limit: 1000 }, userId);
        const allowedCourseIds = userCourses.items.map(c => String(c._id));
        
        return topicRepo.findAll({ ...query, allowedCourseIds }); 
      }
    },

    async getTopic(id, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      const doc = await topicRepo.findById(id);
      if (!doc) throw notFound("Topic not found");

      await checkCourseAccess(doc.courseId, userId);

      return doc;
    },

    async updateTopic(id, data, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");

      const existingTopic = await topicRepo.findById(id);
      if (!existingTopic) throw notFound("Topic not found");

      await checkCourseAccess(existingTopic.courseId, userId);

      const update = {};

      if (data.courseId !== undefined) {
        const newCourseId = String(data.courseId).trim();
        if (!newCourseId) throw badRequest("courseId cannot be empty");
        if (!isValidObjectId(newCourseId)) throw badRequest("courseId must be a valid id");
        
        if (String(existingTopic.courseId) !== newCourseId) {
            await checkCourseAccess(newCourseId, userId);
        }
        update.courseId = newCourseId;
      }

      if (data.topic !== undefined) {
        const t = String(data.topic).trim();
        if (!t) throw badRequest("topic cannot be empty");
        update.topic = t;
      }

      if (data.description !== undefined) update.description = String(data.description).trim();

      if (data.points !== undefined) {
        const p = Number(data.points);
        if (!Number.isFinite(p) || p < 0) throw badRequest("points must be a number >= 0");
        update.points = p;
      }

      if (data.description_img !== undefined) {
        update.description_img = parseImageInput(data.description_img, "description_img");
      }

      if (data.tasks !== undefined) {
        if (!Array.isArray(data.tasks)) throw badRequest("tasks must be an array");
        update.tasks = data.tasks.map(normalizeTask);
      }

      const updated = await topicRepo.updateById(id, update);
      return updated;
    },

    async deleteTopic(id, userId) {
      if (!isValidObjectId(id)) throw badRequest("id must be a valid id");
      
      const existingTopic = await topicRepo.findById(id);
      if (!existingTopic) throw notFound("Topic not found");

      await checkCourseAccess(existingTopic.courseId, userId);

      return topicRepo.deleteById(id);
    },
  };
}

module.exports = { createTopicService };