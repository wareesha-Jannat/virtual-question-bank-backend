import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import cors from "cors";
import cron from "node-cron";

import "./config/passport-jwt-strategy.js";
import connectDb from "./config/connectDb.js";

import User from "./models/User.js";

// Routers...
import subjectRouter from "./routes/subjects.js";
import topicRouter from "./routes/topics.js";
import QuestionRouter from "./routes/questions.js";
import NotificationRouter from "./routes/notifications.js";
import UserRouter from "./routes/users.js";
import DashboardRouter from "./routes/dashboard.js";
import AnalyticsAndReportingRouter from "./routes/analyticsAndReporting.js";
import ResultRouter from "./routes/results.js";
import SupportRequestRouter from "./routes/supportRequests.js";
import ExamSessionRouter from "./routes/examSessions.js";

const app = express();
const port = process.env.PORT || 5000;
const DATABASE_URL = process.env.DB_URL;

const allowedOrigin =
  process.env.FRONTEND_HOST ||
  "https://virtual-question-bank-frontend.vercel.app";

// ==================== CORS FIX ====================
const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.options("*", cors(corsOptions)); // Preflight must be FIRST
app.use(cors(corsOptions));

// ==================== Middleware Order FIX ====================
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ==================== DB Connection ====================
connectDb(DATABASE_URL);

// ==================== Cron Job ====================
cron.schedule("0 0 * * *", async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await User.updateMany(
      { lastLogin: { $lt: thirtyDaysAgo } },
      { isActive: false }
    );
  } catch (error) {}
});

// ==================== Routes ====================
app.use("/subjects", subjectRouter);
app.use("/topics", topicRouter);
app.use("/questions", QuestionRouter);
app.use("/users", UserRouter);
app.use("/notifications", NotificationRouter);
app.use("/exams", ExamSessionRouter);
app.use("/analyticsAndReporting", AnalyticsAndReportingRouter);
app.use("/dashboard", DashboardRouter);
app.use("/results", ResultRouter);
app.use("/support", SupportRequestRouter);
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// ==================== Start Server ====================
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
