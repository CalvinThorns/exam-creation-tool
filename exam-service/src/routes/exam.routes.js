const express = require("express");

function createExamRoutes({ examController }) {
  const router = express.Router();

  // Draft routes (no DB write)
  router.get("/draft/assets/:token/:filename", examController.getDraftAsset);
  router.post("/draft/compile", examController.compileDraft);
  router.post("/draft/regenerate-topic", examController.regenerateDraftTopic);
  router.post("/draft", examController.generateDraft);

  router.post("/", examController.create);
  router.get("/", examController.list);
  router.get("/:id", examController.getById);
  router.put("/:id", examController.updateById);
  router.patch("/:id", examController.updateById);
  router.delete("/:id", examController.deleteById);

  return router;
}

module.exports = { createExamRoutes };
