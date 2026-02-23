import express from "express";
import ExamSessionController from "../controllers/ExamSessionController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = express.Router();

router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(ExamSessionController.startExam),
);

router.patch(
  "/:sessionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(ExamSessionController.finishExam),
);

export default router;
