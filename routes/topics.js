import express from "express";
import TopicController from "../controllers/TopicController.js";
const router = express.Router();
import passport from "passport";
import accessTokenAutoRefresh from "../middlewares/accessTokenAutoRefresh.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//Public Route
router.get("/", asyncHandler(TopicController.getTopics));

//Protected Routes
router.post(
  "/",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(TopicController.addTopic),
);
router.delete(
  "/:topicId",
  accessTokenAutoRefresh,
  passport.authenticate("jwt", { session: false }),
  asyncHandler(TopicController.deleteTopic),
);

export default router;
