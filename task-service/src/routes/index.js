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

const router = express.Router();

const courseRepo = createCourseRepo();
const topicRepo = createTopicRepo();
const courseService = createCourseService({ courseRepo, topicRepo });
const courseController = createCourseController({ courseService });
const topicService = createTopicService({ topicRepo, courseRepo });
const topicController = createTopicController({ topicService });

router.use("/courses", createCourseRoutes({ courseController }));
router.use("/topics", createTopicRoutes({ topicController }));

module.exports = router;
