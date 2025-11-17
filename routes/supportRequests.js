import express from "express";
import SupportRequestController from "../controllers/SupportRequestController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
const router = express.Router();

router.post(
  "/createRequest",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.createSupportRequest
);

router.get(
  "/getRequests",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.getUserSupportRequests
);
router.delete(
  "/deleteRequest",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.deleteRequest
);

router.get(
  "/getRespondedRequests",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.getUserRespondedRequests
);

router.get(
  "/getNewRequests",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.getNewRequests
);

router.post(
  "/saveRequestResponse",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  SupportRequestController.respondToSupportRequest
);

export default router;
