import dotenv from "dotenv"; // Load environment variables from a .env file
dotenv.config();

// Import necessary packages and initialize Express app
import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import passport from "passport";

// Load Passport.js JWT strategy for authentication
import "./config/passport-jwt-strategy.js";

import cors from "cors";
import cron from "node-cron";

// Import the function to connect to the database
import connectDb from "./config/connectDb.js";

// Import User model
import User from "./models/User.js";

// Import routers
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

// Set up the server port and database URL from environment variables
const port = process.env.PORT;
const DATABASE_URL = process.env.DB_URL;

// Configure CORS options to allow the frontend to access this backend
const corsOptions = {
  origin: process.env.FRONTEND_HOST, // Allow requests from the frontend host
  credentials: true, // Allow credentials (cookies, headers)
  optionsSuccessStatus: 200, // Response status for successful preflight requests
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
};

// Apply CORS middleware with the configured options
app.use(cors(corsOptions));

//Databse Connection
connectDb(DATABASE_URL);

// Schedule a cron job to deactivate users who haven’t logged in for 30 days
cron.schedule("0 0 * * *", async () => {
  // Runs daily at midnight
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Update isActive status for users who have not logged in for 30 days
    await User.updateMany(
      { lastLogin: { $lt: thirtyDaysAgo } },
      { isActive: false }
    );
  } catch (error) {}
});

// Middleware to parse incoming JSON payloads
app.use(express.json());

//Cookie parser to parse cookies from requests
app.use(cookieParser());

//Passport Middleware for handling authentication
app.use(passport.initialize());

//Loading Routes
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

// Start the server and listen on the specified port
app.listen(port, () => {});
