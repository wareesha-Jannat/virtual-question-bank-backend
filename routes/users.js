import express from "express";
import UserController from "../controllers/UserController.js";
import { loginLimit } from "../middlewares/rateLimiter.js";
const router = express.Router();
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//Public Routes
router.post(
  "/register",
  loginLimit,
  asyncHandler(UserController.userRegistration),
);
router.post("/login", loginLimit, asyncHandler(UserController.userLogin));
router.post(
  "/password-resets",
  asyncHandler(UserController.sendResetPassword),
);
router.patch(
  "/reset-password/:id/:token",
  asyncHandler(UserController.passwordReset),
);

//Protected routes
router.get(
  "/me",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.userProfile),
);
router.post(
  "/logout",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.userLogout),
);
router.post(
  "/password",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.changePassword),
);
router.get(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.getUsers),
);
router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.addUser),
);
router.patch(
  "/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.updateUser),
);
router.delete(
  "/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.deleteUser),
);

router.patch(
  "/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.updatePersonalInfo),
);
router.get(
  "/me/role",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(UserController.userRole),
);

export default router;
