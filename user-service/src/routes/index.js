const express = require("express");
const { createUserRepo } = require("../repositories/user.repo");
const { createUserAuthService } = require("../services/userAuth.service");
const { createUserService } = require("../services/user.service");
const {
  createUserAuthController,
} = require("../controllers/userAuth.controller");
const { createUserController } = require("../controllers/user.controller");
const { createUserAuthRoutes } = require("./userAuth.routes");
const { createUserRoutes } = require("./user.routes");

const router = express.Router();

const userRepo = createUserRepo();
const userAuthService = createUserAuthService({ userRepo });
const userService = createUserService({ userRepo });

const userAuthController = createUserAuthController({ userAuthService });
const userController = createUserController({ userService });

router.use("/auth", createUserAuthRoutes({ userAuthController }));
router.use("/users", createUserRoutes({ userController }));

module.exports = router;
