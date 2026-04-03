const { badRequest, notFound, forbidden } = require("./helpers/serviceErrors");
const {
  extractRawLatexInput,
  isValidObjectId,
  normalizeTask,
  parseAssetsInput,
  parseImageInput,
  parseTopicLatex,
} = require("./helpers/topicValidation");

function buildTaskLatex(task) {
  const question = String(task?.question || "").trim();
  const solution = String(task?.solution || "").trim();
  const points = Number(task?.points || 0);

  const parts = [`\\subsection{${points}P}`];
  if (question) parts.push(question);
  if (solution) {
    parts.push(`\\begin{solution}\n${solution}\n\\end{solution}`);
  }

  return parts.filter(Boolean).join("\n\n").trim();
}

function buildTopicLatex({ topic, description, tasks }) {
  const parts = [`\\section{${String(topic || "").trim()}}`];
  if (String(description || "").trim()) parts.push(String(description).trim());
  (Array.isArray(tasks) ? tasks : []).forEach((task) => {
    const latex = String(task?.full_tex_code || buildTaskLatex(task)).trim();
    if (latex) parts.push(latex);
  });
  return parts.filter(Boolean).join("\n\n").trim();
}

function selectParsedTopic(parsedTopics, selectedTopic) {
  if (!Array.isArray(parsedTopics) || parsedTopics.length === 0) {
    throw badRequest("No topics could be parsed from the provided LaTeX");
  }

  const normalizedSelectedTopic = String(selectedTopic || "").trim().toLowerCase();
  if (parsedTopics.length === 1) {
    return {
      ...parsedTopics[0],
      topic: String(selectedTopic || parsedTopics[0].topic || "").trim() ||
        parsedTopics[0].topic,
    };
  }

  if (!normalizedSelectedTopic) {
    return parsedTopics[0];
  }

  const matched = parsedTopics.find(
    (topic) =>
      String(topic?.topic || "").trim().toLowerCase() === normalizedSelectedTopic,
  );

  return {
    ...(matched || parsedTopics[0]),
    topic: String(selectedTopic || matched?.topic || parsedTopics[0]?.topic || "").trim() ||
      matched?.topic ||
      parsedTopics[0]?.topic,
  };
}

function normalizeTasksArray(tasks, taskDescription) {
  const normalized = Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
  if (taskDescription && normalized[0]) {
    normalized[0].description = String(taskDescription).trim();
  }
  return normalized;
}

function mergeParsedTasksWithProvidedTasks(parsedTasks, providedTasks) {
  const normalizedParsedTasks = Array.isArray(parsedTasks) ? parsedTasks : [];
  const normalizedProvidedTasks = Array.isArray(providedTasks)
    ? providedTasks.map(normalizeTask)
    : [];

  return normalizedParsedTasks.map((task, index) => {
    const providedTask = normalizedProvidedTasks[index];
    if (!providedTask) return task;

    return {
      ...task,
      description: providedTask.description || task.description,
      question_img: providedTask.question_img || task.question_img,
      assets: providedTask.assets || task.assets,
      solutionSpace: providedTask.solutionSpace || task.solutionSpace,
      isRelatedToTopic:
        providedTask.isRelatedToTopic !== undefined
          ? providedTask.isRelatedToTopic
          : task.isRelatedToTopic,
    };
  });
}

function buildTopicPayload(data) {
  const rawLatex = extractRawLatexInput(data).trim();
  const selectedTopic = String(data.topic || "").trim();
  const hasExplicitTaskAssets = data.taskAssets !== undefined;
  const explicitTaskAssets = parseAssetsInput(data.taskAssets);
  const selectedPoints =
    data.points !== undefined && data.points !== null && data.points !== ""
      ? Number(data.points)
      : undefined;

  if (data.points !== undefined && data.points !== null && data.points !== "") {
    if (!Number.isFinite(selectedPoints) || selectedPoints < 0) {
      throw badRequest("points must be a number >= 0");
    }
  }

  if (rawLatex) {
    const parsedTopics = parseTopicLatex(rawLatex, {
      fallbackTopic: selectedTopic || undefined,
      fallbackPoints: selectedPoints,
    });
    const parsedTopic = selectParsedTopic(parsedTopics, selectedTopic);

    if (
      /\\subsection\{[^}]*\}/.test(String(parsedTopic.full_tex_code || "")) &&
      selectedPoints !== undefined &&
      Number(parsedTopic.points) !== Number(selectedPoints)
    ) {
      throw badRequest(
        "Sum of subsection points must equal the selected points value",
      );
    }

    const parsedTasks = normalizeTasksArray(
      mergeParsedTasksWithProvidedTasks(parsedTopic.tasks, data.tasks),
      data.taskDescription,
    );
    const effectiveTaskDescription = String(
      data.taskDescription || parsedTasks[0]?.description || "",
    ).trim();
    if (!effectiveTaskDescription) {
      throw badRequest("taskDescription is required");
    }
    if (hasExplicitTaskAssets) {
      parsedTasks.forEach((task) => {
        task.assets = explicitTaskAssets;
      });
    }
    if (parsedTasks[0]) parsedTasks[0].description = effectiveTaskDescription;

    return {
      topic: selectedTopic || parsedTopic.topic,
      description:
        data.description !== undefined
          ? String(data.description || "").trim()
          : parsedTopic.description,
      points:
        selectedPoints !== undefined ? selectedPoints : Number(parsedTopic.points),
      full_tex_code: String(data.full_tex_code || rawLatex).trim(),
      tasks: parsedTasks,
    };
  }

  const topic = String(data.topic || "").trim();
  const description =
    data.description !== undefined ? String(data.description || "").trim() : "";
  const points = Number(data.points);

  if (!topic) throw badRequest("topic is required");
  if (!Number.isFinite(points) || points < 0) {
    throw badRequest("points must be a number >= 0");
  }

  if (data.tasks !== undefined && !Array.isArray(data.tasks)) {
    throw badRequest("tasks must be an array");
  }

  const tasks = normalizeTasksArray(data.tasks || [], data.taskDescription);
  const full_tex_code = String(data.full_tex_code || "").trim() ||
    buildTopicLatex({ topic, description, tasks });

  const effectiveTaskDescription = String(
    data.taskDescription || tasks[0]?.description || "",
  ).trim();
  if (!effectiveTaskDescription) {
    throw badRequest("taskDescription is required");
  }

  if (hasExplicitTaskAssets) {
    tasks.forEach((task) => {
      task.assets = explicitTaskAssets;
    });
  }

  if (tasks[0]) tasks[0].description = effectiveTaskDescription;

  return {
    topic,
    description,
    points,
    full_tex_code,
    tasks,
  };
}

function createTopicService({ topicRepo, courseRepo }) {
  const checkCourseAccess = async (courseId, userId) => {
    if (!courseId) throw badRequest("courseId is required");
    const course = await courseRepo.findById(courseId);

    if (!course || course.isDeleted) {
      throw notFound("Course not found");
    }

    const isCreator = String(course.creator) === String(userId);
    const collabs = Array.isArray(course.collaborators)
      ? course.collaborators
      : [];
    const isCollaborator = collabs.some(
      (collaboratorId) => String(collaboratorId) === String(userId),
    );

    if (!isCreator && !isCollaborator) {
      throw forbidden("Access denied for this course");
    }

    return course;
  };

  return {
    async parseLatex(data) {
      const latexContent = extractRawLatexInput(data);
      const topics = parseTopicLatex(latexContent, {
        fallbackTopic: data?.topic,
        fallbackPoints: data?.points,
      }).map((topic) => ({
        ...topic,
        topic: String(data?.topic || topic.topic || "").trim() || topic.topic,
      }));

      return { topics };
    },

    async createTopic(data, userId) {
      const courseId = String(data.courseId || "").trim();

      if (!courseId) throw badRequest("courseId is required");
      if (!isValidObjectId(courseId)) {
        throw badRequest("courseId must be a valid id");
      }

      await checkCourseAccess(courseId, userId);

    const normalized = buildTopicPayload(data);
      const description_img = parseImageInput(data.description_img, "description_img");

      return topicRepo.create({
        courseId,
        topic: normalized.topic,
        description: normalized.description,
        points: normalized.points,
        full_tex_code: normalized.full_tex_code,
        description_img,
        tasks: normalized.tasks,
      });
    },

    async listTopics(query, userId) {
      const courseId = query.courseId ? String(query.courseId).trim() : undefined;

      if (courseId) {
        if (!isValidObjectId(courseId)) {
          throw badRequest("courseId must be a valid id");
        }
        await checkCourseAccess(courseId, userId);
        return topicRepo.findAll({ ...query, courseId });
      }

      const userCourses = await courseRepo.findAllForUser({ limit: 1000 }, userId);
      const allowedCourseIds = userCourses.items.map((course) => String(course._id));
      return topicRepo.findAll({ ...query, allowedCourseIds });
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
        if (!isValidObjectId(newCourseId)) {
          throw badRequest("courseId must be a valid id");
        }
        if (String(existingTopic.courseId) !== newCourseId) {
          await checkCourseAccess(newCourseId, userId);
        }
        update.courseId = newCourseId;
      }

      const hasTopicPayloadFields =
        data.topic !== undefined ||
        data.description !== undefined ||
        data.points !== undefined ||
        data.tasks !== undefined ||
        data.taskDescription !== undefined ||
        Boolean(extractRawLatexInput(data).trim());

      if (hasTopicPayloadFields) {
        const normalized = buildTopicPayload({
          topic: data.topic !== undefined ? data.topic : existingTopic.topic,
          description:
            data.description !== undefined
              ? data.description
              : existingTopic.description,
          points:
            data.points !== undefined ? data.points : existingTopic.points,
          tasks: data.tasks !== undefined ? data.tasks : existingTopic.tasks,
          taskDescription: data.taskDescription,
          full_tex_code:
            data.full_tex_code !== undefined
              ? data.full_tex_code
              : existingTopic.full_tex_code,
          fullTexCode: data.fullTexCode,
          rawLatex: data.rawLatex,
          latexContent: data.latexContent,
          latex: data.latex,
          tex: data.tex,
        });

        update.topic = normalized.topic;
        update.description = normalized.description;
        update.points = normalized.points;
        update.full_tex_code = normalized.full_tex_code;
        update.tasks = normalized.tasks;
      }

      if (data.description_img !== undefined) {
        update.description_img = parseImageInput(
          data.description_img,
          "description_img",
        );
      }

      return topicRepo.updateById(id, update);
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
