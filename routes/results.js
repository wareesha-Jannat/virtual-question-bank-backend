import express from "express";
import ResultController from "../controllers/ResultController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import authorizedRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

router.get(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(ResultController.getResultsByUser),
);
router.get(
  "/:resultId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(ResultController.getSingleResult),
);

router.get(
  "/detail/:id",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Student"),
  asyncHandler(ResultController.getDetailResult),
);

export default router;
