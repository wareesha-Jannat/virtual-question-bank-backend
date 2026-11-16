import express from "express";
import SubjectController from "../controllers/SubjectController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import authorizedRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

//Public Route
router.get("/", asyncHandler(SubjectController.getSubjects));

//Protected Routes
router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(SubjectController.createSubject),
);

router.delete(
  "/:subjectId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(SubjectController.deleteSubject),
);

export default router;
