const { notFound, sendBinaryImage } = require("./helpers/topicImageHelpers");

function createTopicImagesController({ topicRepo }) {
  return {
    getDescriptionImage: async (req, res, next) => {
      try {
        const topic = await topicRepo.findById(req.params.id);
        if (!topic || !topic.description_img || !topic.description_img.data) {
          throw notFound("Image not found");
        }

        return sendBinaryImage(res, topic.description_img);
      } catch (err) {
        next(err);
      }
    },

    getTaskQuestionImage: async (req, res, next) => {
      try {
        const topic = await topicRepo.findById(req.params.id);
        if (!topic) {
          throw notFound("Topic not found");
        }

        const task = topic.tasks.id(req.params.taskId);
        if (!task || !task.question_img || !task.question_img.data) {
          throw notFound("Image not found");
        }

        return sendBinaryImage(res, task.question_img);
      } catch (err) {
        next(err);
      }
    },
  };
}

module.exports = { createTopicImagesController };
