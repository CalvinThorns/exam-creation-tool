const express = require('express');

function createAuthRoutes({ authController }) {
  const router = express.Router();

  router.post('/login', authController.login);
  router.post("/register", authController.register);

  return router;
}

module.exports = { createAuthRoutes };