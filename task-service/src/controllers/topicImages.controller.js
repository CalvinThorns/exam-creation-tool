function createTopicImagesController({ topicRepo }) {
  return {
    getDescriptionImage: async (req, res, next) => {
      try {
        const topic = await topicRepo.findById(req.params.id);
        if (!topic || !topic.description_img || !topic.description_img.data) {
          const err = new Error("Image not found");
          err.status = 404;
          throw err;
        }

        res.setHeader(
          "Content-Type",
          topic.description_img.contentType || "application/octet-stream",
        );
        res.send(topic.description_img.data);
      } catch (err) {
        next(err);
      }
    },

    getTaskQuestionImage: async (req, res, next) => {
      try {
        const topic = await topicRepo.findById(req.params.id);
        if (!topic) {
          const err = new Error("Topic not found");
          err.status = 404;
          throw err;
        }

        const task = topic.tasks.id(req.params.taskId);
        if (!task || !task.question_img || !task.question_img.data) {
          const err = new Error("Image not found");
          err.status = 404;
          throw err;
        }

        res.setHeader(
          "Content-Type",
          task.question_img.contentType || "application/octet-stream",
        );
        res.send(task.question_img.data);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createTopicImagesController };
