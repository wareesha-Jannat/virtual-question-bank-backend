import express from "express";
import NotificationController from "../controllers/NotificationController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import authorizedRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin"),
  asyncHandler(NotificationController.createNotification),
);

router.get(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin", "Student"),
  asyncHandler(NotificationController.getNotifications),
);

router.patch(
  "/:notificationId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin", "Student"),
  asyncHandler(NotificationController.markAsRead),
);

router.get(
  "/unread/count",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  authorizedRoles("Admin", "Student"),
  asyncHandler(NotificationController.checkUnreadNotifications),
);

export default router;
