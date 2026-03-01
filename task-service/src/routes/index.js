const express = require("express");

// courses
const { createCourseRepo } = require("../repositories/course.repo");
const { createCourseService } = require("../services/course.service");
const { createCourseController } = require("../controllers/course.controller");
const { createCourseRoutes } = require("./course.routes");

// topics
const { createTopicRepo } = require("../repositories/topic.repo");
const { createTopicService } = require("../services/topic.service");
const { createTopicController } = require("../controllers/topic.controller");
const { createTopicRoutes } = require("./topic.routes");
const { createTopicImagesController } = require("../controllers/topicImages.controller");
const { createTopicImagesRoutes } = require("./topicImages.routes");

const router = express.Router();

// courses wiring
const courseRepo = createCourseRepo();
const courseService = createCourseService({ courseRepo });
const courseController = createCourseController({ courseService });
router.use("/courses", createCourseRoutes({ courseController }));

// topics wiring
const topicRepo = createTopicRepo();
const topicService = createTopicService({ topicRepo });
const topicController = createTopicController({ topicService });
const topicImagesController = createTopicImagesController({ topicRepo });
router.use("/topics", createTopicRoutes({ topicController }));
router.use("/topics", createTopicImagesRoutes({ topicImagesController }));

module.exports = router;