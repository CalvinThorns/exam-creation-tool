const express = require("express");

// exams
const { createExamRepo } = require("../repositories/exam.repo");
const { createCourseRepo } = require("../repositories/course.repo");
const { createExamService } = require("../services/exam.service");
const { createExamController } = require("../controllers/exam.controller");
const { createExamRoutes } = require("./exam.routes");

const router = express.Router();

// exams wiring
const examRepo = createExamRepo();
const courseRepo = createCourseRepo();

const examService = createExamService({ examRepo, courseRepo });

const examController = createExamController({ examService });
router.use("/exams", createExamRoutes({ examController }));

module.exports = router;
