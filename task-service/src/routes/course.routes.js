const express = require("express");

function createCourseRoutes({ courseController }) {
  const router = express.Router();

  router.post("/", courseController.create);
  router.get("/", courseController.list);
  router.get("/:id", courseController.getById);
  router.put("/:id", courseController.updateById);
  router.patch("/:id", courseController.updateById);
  router.delete("/:id", courseController.deleteById);

  return router;
}

module.exports = { createCourseRoutes };
