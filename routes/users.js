import express from "express";
import UserController from "../controllers/UserController.js";
const router = express.Router();
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";

//Public Routes
router.post("/register", UserController.userRegistration);
router.post("/login", UserController.userLogin);
router.post("/reset-password-link", UserController.sendResetPassword);
router.post("/reset-password/:id/:token", UserController.passwordReset);

//Protected routes
router.get(
  "/me",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.userProfile
);
router.post(
  "/logout",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.userLogout
);
router.post(
  "/changePassword",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.changePassword
);
router.get(
  "/getUsers",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.getUsers
);
router.post(
  "/addUser",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.addUser
);
router.put(
  "/updateUser/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.updateUser
);
router.delete(
  "/deleteUser/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.deleteUser
);
router.delete(
  "/deleteAccount/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.deleteUser
);
router.put(
  "/updatePersonalInfo/:userId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.updatePersonalInfo
);
router.get(
  "/me/role",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  UserController.userRole
);

export default router;
