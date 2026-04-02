const express = require("express");
const { protect } = require("../middlewares/auth.middleware"); 

function createExamRoutes({ examController }) {
  const router = express.Router();

  router.get("/draft/assets/:token/:filename", examController.getDraftAsset);
  router.use(protect);

  // Draft routes (no DB write)
  router.post("/draft/compile", examController.compileDraft);
  router.post("/draft/regenerate-topic", examController.regenerateDraftTopic);
  router.post("/draft", examController.generateDraft);
  router.post("/compile-latex", examController.compileLatexOnly);
  
  // Latex Template routes
  router.get("/latex-template/base", examController.getBaseLatexTemplate);
  router.put("/latex-template/base", examController.updateBaseLatexTemplate);

  // Standard CRUD routes
  router.post("/", examController.create);
  router.get("/", examController.list);
  router.get("/:id", examController.getById);
  router.put("/:id", examController.updateById);
  router.patch("/:id", examController.updateById);
  router.delete("/:id", examController.deleteById);

  return router;
}

module.exports = { createExamRoutes };