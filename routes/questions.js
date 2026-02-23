import express from "express";
import QuestionController from "../controllers/QuestionController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = express.Router();

//Public Route
router.get(
  "/",
  asyncHandler(QuestionController.getQuestionPageQuestions),
);

//Protected Routes
router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(QuestionController.addQuestion),
);

router.get(
  "/admin",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(QuestionController.getQuestionsByAdmin),
);

router.patch(
  "/:questionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(QuestionController.updateQuestion),
);

router.delete(
  "/:questionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(QuestionController.deleteQuestion),
);

router.post(
  "/evaluations",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(QuestionController.evaluateResponse),
);

export default router;
