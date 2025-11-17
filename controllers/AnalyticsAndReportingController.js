import Question from "../models/Question.js";
import Result from "../models/Result.js";
import User from "../models/User.js";
import ExamSession from "../models/ExamSession.js";

class AnalyticsAndReportingController {
  //Reporting data
  static reportingData = async (req, res) => {
    try {
      const { subjectId, topicId, difficulty, startDate, endDate } = req.body;

      // Validate that the required subjectId is provided
      if (!subjectId) {
        return res.status(400).json({ message: "Subject ID is required." });
      }

      const filters = {
        subjectId,
        ...(topicId && { topicList: topicId }),
        ...(difficulty && { difficulty }),
        ...(startDate &&
          endDate && {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          }),
      };

      // Get all exam sessions that match the filters
      const examSessions = await ExamSession.find(filters).select("_id");

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

      // Get question-wise data from the Question collection
      const questionWiseData = await Question.find({
        subjectId,
        topicId,
        usageCount: { $gt: 0 },
      })
        .select("questionText correctCount incorrectCount")
        .sort({ lastAttempted: -1 })
        .lean();

      const questionWiseResults = questionWiseData.map((question, index) => ({
        questionNumber: index + 1,
        question: question.questionText,
        correct: question.correctCount,
        incorrect: question.incorrectCount,
      }));

      // Send both score distribution and question-wise data to the frontend
      res.json({
        scoreDistributionData: results,
        questionWiseData: questionWiseResults,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };

  // Analytics data
  static analyticsData = async (req, res) => {
    try {
      // Calculate performance metrics using the Result model
      const performanceMetrics = await Result.aggregate([
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
      ]);

      // Destructure the metrics, provide defaults if no data
      const {
        averageScore = 0,
        highestScore = 0,
        lowestScore = 0,
      } = performanceMetrics[0] || {};

      // Calculate user engagement
      const activeUsersCount = await User.countDocuments({ isActive: true });

      const inactiveUsersCount = await User.countDocuments({ isActive: false });

      //Question Usage
      const questionUsageData = await Question.aggregate([
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
      ]);

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
    } catch (error) {
      res.status(500).json({ message: "Error fetching analytics data", error });
    }
  };
  //PErformance data for student

  // Performance data
  static performanceData = async (req, res) => {
    try {
      const user = req.user; //  user is authenticated and user ID is available

      // 1. Calculate exams taken per subject by the logged-in user

      const examTakenPerSubject = await ExamSession.aggregate([
        { $match: { userId: user._id } }, // Filter by user ID
        {
          $group: {
            _id: "$subjectId", // Group by subject ID
            count: { $sum: 1 }, // Count the number of exams taken per subject
          },
        },
        {
          $lookup: {
            from: "subjects", // The name of the Subject collection
            localField: "_id", // Subject ID from ExamSession
            foreignField: "_id", // Subject ID in Subject collection
            as: "subjectInfo", // Name for the populated field
          },
        },
        {
          $unwind: {
            path: "$subjectInfo", // Unwind the subject info array
            preserveNullAndEmptyArrays: true, // Keep documents even if there is no match
          },
        },
        {
          $project: {
            _id: 0,
            label: { $ifNull: ["$subjectInfo.name", "Unknown Subject"] }, // Get subject name or default to 'Unknown'
            value: "$count", // Use the count as value
          },
        },
      ]);

      const incorrectAnswers = user.practiceQuestionCount - user.correctAnswers;
      const practiceQuestionStats = [
        { label: "Incorrect Answers", value: incorrectAnswers || 0 },
        { label: "Correct Answers", value: user.correctAnswers || 0 },
      ];

      // 3. Calculate exam performance result
      const examPerformance = await Result.aggregate([
        {
          $match: { userId: user._id }, // Filter by logged-in user
        },
        {
          $lookup: {
            from: "examsessions", // The name of the ExamSession collection
            localField: "examSessionId", // Field from Result
            foreignField: "_id", // Field from ExamSession
            as: "examSessionInfo", // Name for the populated field
          },
        },
        {
          $unwind: {
            path: "$examSessionInfo", // Unwind to work with single exam session data
            preserveNullAndEmptyArrays: true, // Keep documents even if there is no match
          },
        },
        {
          $group: {
            _id: "$examSessionInfo.subjectId", // Group by subject ID
            correctAnswers: { $sum: "$correctAnswers" }, // Sum correct answers
            totalQuestions: { $sum: "$examSessionInfo.totalQuestions" }, // Use the totalQuestions from ExamSession
          },
        },
        {
          $lookup: {
            from: "subjects", // The name of the Subject collection
            localField: "_id", // Subject ID from Result aggregation
            foreignField: "_id", // Subject ID in Subject collection
            as: "subjectInfo", // Name for the populated field
          },
        },
        {
          $unwind: {
            path: "$subjectInfo", // Unwind the subject info array
            preserveNullAndEmptyArrays: true, // Keep documents even if there is no match
          },
        },
        {
          $project: {
            _id: 0,
            subjectName: { $ifNull: ["$subjectInfo.name", "Unknown Subject"] }, // Get subject name or default to 'Unknown'
            correctAnswers: 1,
            incorrectAnswers: {
              $subtract: ["$totalQuestions", "$correctAnswers"],
            }, // Calculate incorrect answers
          },
        },
      ]);

      // 4. Calculate overall scores for the logged-in user
      const overallScores = await Result.aggregate([
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
      ]);

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

      // Send the response
      res.status(200).json(performanceData);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error fetching performance data", error });
    }
  };
}

export default AnalyticsAndReportingController;
