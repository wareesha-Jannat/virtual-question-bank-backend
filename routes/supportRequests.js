import express from "express";
import SupportRequestController from "../controllers/SupportRequestController.js";
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const router = express.Router();

router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(SupportRequestController.createSupportRequest),
);

router.delete(
  "/:id",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(SupportRequestController.deleteRequest),
);

router.get(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler((req, res)=>{
    const {type} = req.query;
    if(type === "new"){
      return SupportRequestController.getNewRequests(req, res)
    }
    if(type === "responded"){
      return SupportRequestController.getUserRespondedRequests(req, res)
    }
    return SupportRequestController.getUserSupportRequests(req, res)
  }),
);

router.patch(
  "/:id",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(SupportRequestController.respondToSupportRequest),
);

export default router;
