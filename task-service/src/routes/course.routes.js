const express = require("express");
const { protect } = require("../middlewares/auth.middleware"); 

function createCourseRoutes({ courseController }) {
  const router = express.Router();

  router.use(protect);

  router.post("/", courseController.create);
  router.get("/", courseController.list);
  router.get("/:id", courseController.getById);
  router.put("/:id", courseController.updateById);
  router.patch("/:id", courseController.updateById);
  router.delete("/:id", courseController.deleteById);

  router.post("/:id/collaborators", courseController.addCollaborator);

  return router;
}

module.exports = { createCourseRoutes };