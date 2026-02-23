import express from "express";
import AnalyticsAndReportingController from "../controllers/AnalyticsAndReportingController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = express.Router();

router.post(
  "/reports",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(AnalyticsAndReportingController.reportingData),
);

router.get(
  "/analytics",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(AnalyticsAndReportingController.analyticsData),
);

router.get(
  "/performance",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(AnalyticsAndReportingController.performanceData),
);

export default router;
