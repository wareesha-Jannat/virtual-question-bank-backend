import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import ExamSession from "../models/ExamSession.js";
import mongoose from "mongoose";

class AnalyticsAndReportingController {
  //Reporting data
  static reportingData = async (req, res) => {
    const {
      subjectName,
      topicName,
      difficulty,
      dateRange = {},
    } = req.body;
    const { start: startDate, end: endDate } = dateRange;

    if (!subjectName) {
      return res.status(400).json({ message: "Subject name is required." });
    }

    const filters = {
      subjectName,
      status: "Completed",
      ...(topicName && { topicNames: topicName }),
      ...(difficulty && { difficulty }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate ? { $lte: new Date(endDate) } : { $lte: new Date() }),
        },
      }),
    };

    const [examSessions, questionWiseData] = await Promise.all([
      ExamSession.find(filters).select("_id"),
      ExamSession.aggregate([
        { $match: filters },
        { $unwind: "$questions" },
        {
          $group: {
            _id: {
              questionText: "$questions.questionText",
              questionType: "$questions.questionType",
            },
            correct: {
              $sum: {
                $cond: [{ $eq: ["$questions.isCorrect", true] }, 1, 0],
              },
            },
            incorrect: {
              $sum: {
                $cond: [{ $eq: ["$questions.isCorrect", true] }, 0, 1],
              },
            },
          },
        },
        { $sort: { "_id.questionText": 1 } },
        {
          $project: {
            _id: 0,
            question: "$_id.questionText",
            correct: 1,
            incorrect: 1,
          },
        },
      ]),
    ]);

    // Extract the exam session IDs
    const examSessionIds = examSessions.map((session) => session._id);

    // Query the Result collection for the filtered exam sessions
    const results = await Result.aggregate([
      {
        $match: {
          examSessionId: { $in: examSessionIds },
        },
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ["$percentage", 40] }, then: "0-40%" },
                {
                  case: {
                    $and: [
                      { $gt: ["$percentage", 40] },
                      { $lte: ["$percentage", 60] },
                    ],
                  },
                  then: "41-60%",
                },
                {
                  case: {
                    $and: [
                      { $gt: ["$percentage", 60] },
                      { $lte: ["$percentage", 80] },
                    ],
                  },
                  then: "61-80%",
                },
                { case: { $gt: ["$percentage", 80] }, then: "81-100%" },
              ],
              default: "0-40%", // Default to "0-40%" if percentage is missing
            },
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          label: "$_id",
          value: "$count",
          _id: 0,
        },
      },
    ]);

    const questionWiseResults = questionWiseData.map((question, index) => ({
      questionNumber: index + 1,
      question: question.question,
      correct: question.correct,
      incorrect: question.incorrect,
    }));

    // Send both score distribution and question-wise data to the frontend
    res.json({
      scoreDistributionData: results,
      questionWiseData: questionWiseResults,
    });
  };

  // Analytics data
  static analyticsData = async (req, res) => {
    // Calculate performance metrics using the Result model
    const [
      performanceMetrics,
      activeUsersCount,
      inactiveUsersCount,
      questionUsageData,
    ] = await Promise.all([
      Result.aggregate([
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$percentage" }, // Average percentage
            highestScore: { $max: "$percentage" }, // Highest percentage
            lowestScore: { $min: "$percentage" }, // Lowest percentage
          },
        },
        {
          $project: {
            _id: 0,
            averageScore: { $round: ["$averageScore", 2] },
            highestScore: { $round: ["$highestScore", 2] },
            lowestScore: { $round: ["$lowestScore", 2] },
          },
        },
      ]),
      // Calculate user engagement
      User.countDocuments({ isActive: true }),

      User.countDocuments({ isActive: false }),

      //Question Usage
      Question.aggregate([
        // Step 1: Look up the subject to get the subject name
        {
          $lookup: {
            from: "subjects", // The name of the collection to join with
            localField: "subjectId", // The field from `questions` to match
            foreignField: "_id", // The field from `subjects` to match
            as: "subjectDetails", // Alias for the array of matched subject documents
          },
        },

        // Step 2: Unwind the subjectDetails array
        {
          $unwind: {
            path: "$subjectDetails", // Unwind the `subjectDetails` array
            preserveNullAndEmptyArrays: true, // Keep documents even if there is no match
          },
        },

        // Step 3: Group by subject and accumulate usage counts
        {
          $group: {
            _id: { $ifNull: ["$subjectDetails.name", "Unknown"] }, // Group by subject name or "Unknown" if no subject
            totalUsageCount: { $sum: { $ifNull: ["$usageCount", 0] } }, // Sum usageCount, default to 0 if not defined
          },
        },

        // Step 4: Project the result in the desired format
        {
          $project: {
            label: "$_id", // Use the grouped subject name as the label
            value: "$totalUsageCount", // The accumulated usage count as the value
            _id: 0, // Exclude _id field from the final output
          },
        },
        {
          $sort: { value: -1 },
        },
      ]),
    ]);

    // Destructure the metrics, provide defaults if no data
    const {
      averageScore = 0,
      highestScore = 0,
      lowestScore = 0,
    } = performanceMetrics[0] || {};

    // Prepare the final response object
    const analyticsData = {
      performanceData: [
        { label: "Average Score", value: averageScore },
        { label: "Highest Score", value: highestScore },
        { label: "Lowest Score", value: lowestScore },
      ],
      userEngagementData: [
        { label: "Active Users", value: activeUsersCount },
        { label: "Inactive Users", value: inactiveUsersCount },
      ],
      questionUsageData: questionUsageData, // Updated with the new structure
    };

    // Send the response
    res.status(200).json(analyticsData);
  };
  //PErformance data for student

  // Performance data
  static performanceData = async (req, res) => {
    const id = new mongoose.Types.ObjectId(req.user._id); //  user is authenticated and user ID is available
    const user = await User.findById(id);
    const [examTakenPerSubject, examPerformance, overallScores] =
      await Promise.all([
        // 1. Calculate exams taken per subject by the logged-in user
        ExamSession.aggregate([
          { $match: { userId: user._id } }, // Filter by user ID
          {
            $group: {
              _id: {
                $cond: [
                  { $eq: [{ $ifNull: ["$subjectName", ""] }, ""] },
                  "Unknown Subject",
                  "$subjectName",
                ],
              },
              count: { $sum: 1 }, // Count the number of exams taken per subject
            },
          },
          {
            $project: {
              _id: 0,
              label: "$_id",
              value: "$count", // Use the count as value
            },
          },
          {
            $sort: { value: -1 },
          },
        ]),

        // Calculate exam performance from evaluated question snapshots.
        ExamSession.aggregate([
          {
            $match: { userId: user._id, status: "Completed" },
          },
          { $unwind: "$questions" },
          {
            $group: {
              _id: {
                $cond: [
                  { $eq: [{ $ifNull: ["$subjectName", ""] }, ""] },
                  "Unknown Subject",
                  "$subjectName",
                ],
              },
              correctAnswers: {
                $sum: {
                  $cond: [{ $eq: ["$questions.isCorrect", true] }, 1, 0],
                },
              },
              totalQuestions: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              subjectName: "$_id",
              correctAnswers: 1,
              incorrectAnswers: {
                $subtract: ["$totalQuestions", "$correctAnswers"],
              },
            },
          },
        ]),

        // 4. Calculate overall scores for the logged-in user
        Result.aggregate([
          {
            $match: { userId: user._id }, // Filter by logged-in user
          },
          {
            $group: {
              _id: null,
              averageScore: { $avg: "$percentage" },
              highestScore: { $max: "$percentage" },
              lowestScore: { $min: "$percentage" },
            },
          },
          {
            $project: {
              _id: 0,
              averageScore: { $round: ["$averageScore", 2] },
              highestScore: { $round: ["$highestScore", 2] },
              lowestScore: { $round: ["$lowestScore", 2] },
            },
          },
        ]),
      ]);

    const incorrectAnswers = user.practiceQuestionCount - user.correctAnswers;
    const practiceQuestionStats = [
      { label: "Incorrect Answers", value: incorrectAnswers || 0 },
      { label: "Correct Answers", value: user.correctAnswers || 0 },
    ];

    const {
      averageScore = 0,
      highestScore = 0,
      lowestScore = 0,
    } = overallScores[0] || {};

    // Prepare the final response object
    const performanceData = {
      examTakenPerSubject,
      practiceQuestionStats,
      examPerformance,
      overallScores: [
        { label: "Average Score", value: averageScore },
        { label: "Highest Score", value: highestScore },
        { label: "Lowest Score", value: lowestScore },
      ],
    };
    console.log(examTakenPerSubject, practiceQuestionStats, examPerformance);
    // Send the response
    res.status(200).json(performanceData);
  };
}

export default AnalyticsAndReportingController;
