const express = require("express");

function createTopicRoutes({ topicController }) {
  const router = express.Router();

  router.post("/", topicController.create);
  router.get("/", topicController.list);
  router.get("/:id", topicController.getById);
  router.put("/:id", topicController.updateById);
  router.patch("/:id", topicController.updateById);
  router.delete("/:id", topicController.deleteById);

  return router;
}

module.exports = { createTopicRoutes };
