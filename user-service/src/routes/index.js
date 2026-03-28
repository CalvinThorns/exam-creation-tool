const express = require("express");
const { createUserRepo } = require("../repositories/user.repo");
const { createUserAuthService } = require("../services/userAuth.service");
const {
  createUserAuthController,
} = require("../controllers/userAuth.controller");
const { createUserAuthRoutes } = require("./userAuth.routes");

const router = express.Router();

const userRepo = createUserRepo();
const userAuthService = createUserAuthService({ userRepo });
const userAuthController = createUserAuthController({ userAuthService });

router.use("/users", createUserAuthRoutes({ userAuthController }));

module.exports = router;
