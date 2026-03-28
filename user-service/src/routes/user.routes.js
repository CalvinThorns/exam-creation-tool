const express = require("express");

function createUserRoutes({ userController }) {
  const router = express.Router();

  router.get("/", userController.list);
  router.get("/:id", userController.getById);

  return router;
}

module.exports = { createUserRoutes };
