import express from "express";
import ExamSessionController from "../controllers/ExamSessionController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import authorizedRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(ExamSessionController.startExam),
);

router.patch(
  "/:sessionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(ExamSessionController.finishExam),
);

export default router;
