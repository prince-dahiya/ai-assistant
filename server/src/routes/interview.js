const express = require("express");

const {
  startInterview,
  submitAnswer,
  getInterviews,
  getInterview,
} = require("../controllers/interviewcontroller.js");

const {
  protect,
  studentOnly,
} = require("../middleware/auth.js");

const router = express.Router();

router.use(protect); // all routes require auth

router.post("/start", studentOnly, startInterview);

router.post("/submit-answer", studentOnly, submitAnswer);

router.get("/", studentOnly, getInterviews);

router.get("/:id", studentOnly, getInterview);

module.exports = router;