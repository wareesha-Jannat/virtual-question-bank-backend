import User from "../models/User.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import ExamSession from "../models/ExamSession.js";
import Result from "../models/Result.js";
import Activity from "../models/Activity.js";

class DashboardController {
  // Dashboard data
  static dashboardData = async (req, res) => {
    try {
      const users = await User.countDocuments({}); // Count the total number of users in the system
      const questions = await Question.countDocuments({}); // Count the total number of questions in the system
      const subjects = await Subject.countDocuments({}); // Count the total number of subjects in the system
      const examsTaken = await ExamSession.countDocuments({}); // Count the total number of exams taken in the system

      // Fetch recent activity data
      const recentActivity = await Activity.find()
        .populate("user", "name") // Populate user field to get the user's name
        .sort({ timestamp: -1 }) // Sort by timestamp in descending order
        .limit(10); // Limit to the most recent 10 activities

      // Aggregate data for the exam chart
      const examChartData = await Result.aggregate([
        {
          $group: {
            _id: "$isPass", // Group by the isPass field
            value: { $sum: 1 }, // Count the number of results in each group
          },
        },
        {
          $project: {
            // Project 'name' based on whether the results are passed or failed
            name: {
              $cond: [{ $eq: ["$_id", true] }, "Passed", "Failed"], // Assign "Passed" if _id is true, otherwise "Failed"
            },
            value: 1,
          },
        },
      ]);

      // Aggregate data for user activity by day of the week
      const userActivityData = await ExamSession.aggregate([
        {
          $group: {
            _id: { $dayOfWeek: "$startTime" }, // Group by the day of the week based on startTime
            examTaken: { $sum: 1 }, // Count the number of exams taken
          },
        },
        {
          $project: {
            name: {
              // Convert the day number to day name using a switch statement
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                  { case: { $eq: ["$_id", 2] }, then: "Monday" },
                  { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                  { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                  { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                  { case: { $eq: ["$_id", 6] }, then: "Friday" },
                  { case: { $eq: ["$_id", 7] }, then: "Saturday" },
                ],
                default: "Unknown",
              },
            },
            examTaken: 1, // Include the count of exams taken
          },
        },
        {
          $sort: { _id: 1 }, // Sort by day of the week
        },
      ]);

      // Combine all the collected data into a single object
      const dashboardData = {
        name: req.user.name,
        users,
        questions,
        subjects,
        examsTaken,
        recentActivity,
        examChartData,
        userActivityData,
      };

      // Send the response
      res.status(200).json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };

  //Student

  // Student dashboard data
  static studentDashboardData = async (req, res) => {
    try {
      const user = req.user;

      // Count the number of exams taken by the user
      const examTaken = await ExamSession.countDocuments({ userId: user });

      // Calculate average percentage from exam results
      const averagePercentageData = await Result.aggregate([
        {
          $match: { userId: user._id }, // Filter by userId
        },
        {
          $group: {
            _id: null, // No grouping, just calculate overall
            averagePercentage: { $avg: "$percentage" }, // Calculate the average of the percentage field
          },
        },
        {
          $project: {
            _id: 0,
            averagePercentage: { $round: ["$averagePercentage", 2] },
          },
        },
      ]);

      const averagePercentage =
        averagePercentageData[0]?.averagePercentage || 0;
      // Fetch recent activity data
      const recentActivity = await Activity.find({ user: user._id })
        .populate("user", "name")
        .sort({ timestamp: -1 })
        .limit(10);

      // Aggregate data for the exam chart
      const examChartData = await Result.aggregate([
        {
          $match: { userId: user._id },
        },
        {
          $group: {
            _id: "$isPass", // Group by the isPass field
            value: { $sum: 1 }, // Count the number of results in each group
          },
        },
        {
          $project: {
            // Project 'name' based on whether the results are passed or failed
            name: {
              $cond: [{ $eq: ["$_id", true] }, "Passed", "Failed"], // Assign "Passed" if _id is true, otherwise "Failed"
            },
            value: 1,
          },
        },
      ]);

      // Get exams taken per day of the week for activity chart
      const userActivityData = await ExamSession.aggregate([
        {
          $match: { userId: user._id },
        },
        {
          $group: {
            _id: { $dayOfWeek: "$startTime" },
            examTaken: { $sum: 1 },
          },
        },
        {
          $project: {
            name: {
              $switch: {
                branches: [
                  { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                  { case: { $eq: ["$_id", 2] }, then: "Monday" },
                  { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                  { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                  { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                  { case: { $eq: ["$_id", 6] }, then: "Friday" },
                  { case: { $eq: ["$_id", 7] }, then: "Saturday" },
                ],
                default: "Unknown",
              },
            },
            examTaken: 1,
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Combine all the collected data into a single object
      const dashboardData = {
        name: user.name,
        practiceQuestions: user.practiceQuestionCount,
        correctAnswers: user.correctAnswers,
        examTaken,
        averagePercentage,
        recentActivity,
        examChartData,
        userActivityData,
      };

      res.status(200).json(dashboardData);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

export default DashboardController;
