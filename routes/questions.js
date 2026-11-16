import express from "express";
import QuestionController from "../controllers/QuestionController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import authorizedRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

//Public Route
router.get("/", asyncHandler(QuestionController.getQuestionPageQuestions));

//Protected Routes
router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(QuestionController.addQuestion),
);

router.get(
  "/admin",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(QuestionController.getQuestionsByAdmin),
);

router.patch(
  "/:questionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(QuestionController.updateQuestion),
);

router.delete(
  "/:questionId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(QuestionController.deleteQuestion),
);

router.post(
  "/evaluations",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(QuestionController.evaluateResponse),
);

export default router;
