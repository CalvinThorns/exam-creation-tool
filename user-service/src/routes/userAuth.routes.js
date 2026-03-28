const express = require("express");

function createUserAuthRoutes({ userAuthController }) {
  const router = express.Router();

  router.post("/register", userAuthController.register);
  router.post("/login", userAuthController.login);
  router.post("/reset-password", userAuthController.resetPassword);

  return router;
}

module.exports = { createUserAuthRoutes };
