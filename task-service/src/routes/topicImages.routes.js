const express = require("express");

function createTopicImagesRoutes({ topicImagesController }) {
  const router = express.Router();

  router.get(
    "/:id/description-image",
    topicImagesController.getDescriptionImage,
  );
  router.get(
    "/:id/tasks/:taskId/question-image",
    topicImagesController.getTaskQuestionImage,
  );

  return router;
}

module.exports = { createTopicImagesRoutes };
