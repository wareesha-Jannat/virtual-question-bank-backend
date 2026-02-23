import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import cors from "cors";
import cron from "node-cron";
import helmet from "helmet";
import morgan from "morgan";
import { globalErrorHandler } from "./middlewares/errorMiddleware.js";

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

//Handle unCaught exception
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

const app = express();
const port = process.env.PORT || 5000;
const DATABASE_URL = process.env.DB_URL;

// DB Connection
connectDb(DATABASE_URL);

//Middlewares

app.set("trust proxy", 1);

const allowedOrigin =
  process.env.FRONTEND_HOST ||
  "https://virtual-question-bank-frontend.vercel.app";

// CORS
const corsOptions = {
  origin: allowedOrigin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.options("*", cors(corsOptions)); // Preflight must be FIRST
app.use(cors(corsOptions));

// Security headers, logging, parsing
app.use(helmet());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Cron Job
cron.schedule("0 0 * * *", async () => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await User.updateMany(
      { lastLogin: { $lt: thirtyDaysAgo } },
      { isActive: false },
    );
  } catch (error) {}
});

// Routes
app.use("/subjects", subjectRouter);
app.use("/topics", topicRouter);
app.use("/questions", QuestionRouter);
app.use("/users", UserRouter);
app.use("/notifications", NotificationRouter);
app.use("/exam-sessions", ExamSessionRouter);
app.use("/insights", AnalyticsAndReportingRouter);
app.use("/dashboard", DashboardRouter);
app.use("/results", ResultRouter);
app.use("/support-requests", SupportRequestRouter);

app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

//404 Error handler
app.use((req, res, next) => {
  res.status(404).json({message : "Route not found "})
})

app.use(globalErrorHandler)
// Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});

// Graceful Shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Closing server gracefully...`);
  server.close(() => {
    console.log("Server closed. Exiting process.");
    process.exit(0);
  });

  // Force exit after 10 seconds if connections are stuck
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(reason);

  gracefulShutdown("unhandledRejection");
});
