import express from "express";
import DashboardController from "../controllers/DashboardController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = express.Router();

router.get(
  "/admin",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(DashboardController.dashboardData),
);

router.get(
  "/student",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(DashboardController.studentDashboardData),
);

export default router;
