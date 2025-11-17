import Question from "../models/Question.js";
import ExamSession from "../models/ExamSession.js";
import Result from "../models/Result.js";
import Activity from "../models/Activity.js";

class ExamSessionController {
  //Start Exam
  static startExam = async (req, res) => {
    try {
      const userId = req.user.id;
      const {
        subjectId,
        totalQuestions,
        selectedTopics,
        difficulty,
        duration,
        questionType,
      } = req.body;

      // Determine the query filter based on question type
      const baseQueryFilter = {
        subjectId,
        topicId: { $in: selectedTopics },
      };
      // Include the difficulty level only if it is provided and not set to "All"
      if (difficulty && difficulty !== "All") {
        baseQueryFilter.difficultyLevel = difficulty;
      }

      let questions = [];

      if (questionType === "MCQ") {
        questions = await Question.find({
          ...baseQueryFilter,
          questionType: "MCQ",
        });
      } else if (questionType === "Descriptive") {
        questions = await Question.find({
          ...baseQueryFilter,
          questionType: "Descriptive",
        });
      } else if (questionType === "Both") {
        // Fetch both types of questions
        const mcqQuestions = await Question.find({
          ...baseQueryFilter,
          questionType: "MCQ",
        });
        const descriptiveQuestions = await Question.find({
          ...baseQueryFilter,
          questionType: "Descriptive",
        });

        // Mix MCQs and descriptive questions
        const mcqCount = Math.ceil(totalQuestions * 0.7);
        const descriptiveCount = totalQuestions - mcqCount;

        questions = [
          ...mcqQuestions.slice(0, mcqCount),
          ...descriptiveQuestions.slice(0, descriptiveCount),
        ];
      }

      // Check if there are enough questions to meet the 40% threshold
      if (questions.length < Math.ceil(totalQuestions * 0.4)) {
        return res.status(400).json({
          message:
            "Not enough questions to take the exam. Please adjust your criteria or try with fewer questions.",
        });
      }

      // If not enough questions are fetched,more than threshold but less than total questions fill the gap by repeating them
      const selectedQuestions = this.ensureUniqueSelection(
        questions,
        totalQuestions
      );

      // Create a new exam session
      const newExamSession = new ExamSession({
        userId,
        subjectId,
        topicList: selectedTopics,
        totalQuestions,
        difficulty,
        duration,
        questionType,
        questions: selectedQuestions.map((q) => ({ questionId: q._id })),
      });

      // Save the exam session
      const savedExamSession = await newExamSession.save();

      // Populate the session with questions and other details
      const populatedExamSession = await ExamSession.findById(
        savedExamSession._id
      )
        .populate({
          path: "questions.questionId",
          select: "questionText options questionType correctAnswer explanation",
        })
        .populate({ path: "subjectId", select: "name" })
        .populate({ path: "userId", select: "name" })
        .populate({ path: "topicList", select: "name" })
        .select("-createdAt -updatedAt");

      // Respond with the session details
      return res.status(201).json(populatedExamSession);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  };

  // Helper function to ensure the selected questions meet the required count without consecutive duplicates
  static ensureUniqueSelection(questions, totalQuestions) {
    const selectedQuestions = [];

    if (questions.length === 0) {
      return selectedQuestions;
    }

    let index = 0;

    // Repeat questions until the required number is met
    while (selectedQuestions.length < totalQuestions) {
      const currentQuestion = questions[index % questions.length];

      // Check the last selected question to avoid duplicates in a row
      if (
        selectedQuestions.length === 0 ||
        selectedQuestions[selectedQuestions.length - 1]._id.toString() !==
          currentQuestion._id.toString()
      ) {
        selectedQuestions.push(currentQuestion);
      }

      // Move to the next question
      index++;
    }

    return selectedQuestions;
  }

  // Finish Exam
  static finishExam = async (req, res) => {
    try {
      // Destructure the provided examSession object from the request body
      const { examSession } = req.body;

      // Find the exam session by ID to ensure it exists in the database
      const existingExamSession = await ExamSession.findById(examSession._id);

      if (!existingExamSession) {
        return res.status(404).json({ message: "Exam session not found" });
      }

      // Check status
      if (examSession.status === "Cancelled") {
        await ExamSession.deleteOne({ _id: examSession._id });
        return res.status(200).json({
          message: "Exam cancelled",
        });
      }

      let correctAnswersCount = 0;

      // Evaluate each question
      examSession.questions = await Promise.all(
        examSession.questions.map(async (q) => {
          const correctAnswer = q.questionId.correctAnswer; // For MCQs
          const userAnswer = q.userAnswer ? q.userAnswer.trim() : ""; // Ensure userAnswer is not undefined
          const questionId = q.questionId._id;

          let isCorrect = false;
          let feedback = "";

          if (q.questionId.questionType === "MCQ") {
            // For MCQ questions
            isCorrect = userAnswer === correctAnswer.trim();
            feedback = isCorrect
              ? "Excellent Performance."
              : `Incorrect. The correct answer is: ${correctAnswer}, try again`;
          } else if (q.questionId.questionType === "Descriptive") {
            // For Descriptive questions
            const keywords = q.questionId.keywords || [];
            const matchedKeywords = keywords.filter((keyword) =>
              userAnswer.toLowerCase().includes(keyword.toLowerCase())
            );

            // Consider it correct if the user’s answer contains a majority of the keywords
            const keywordMatchThreshold = 0.6; // Example: 60% of keywords should match
            isCorrect =
              matchedKeywords.length / keywords.length >= keywordMatchThreshold;
            feedback = isCorrect
              ? "Well done, you covered most of the key points."
              : "Incomplete, try again ";
          }

          // Count the correct answers
          if (isCorrect) {
            correctAnswersCount++;
            // Increment correctCount for this question
            await Question.findByIdAndUpdate(questionId, {
              $inc: { usageCount: 1, correctCount: 1 },
              $set: { lastAttempted: new Date() },
            });
          } else {
            // Increment incorrectCount for this question
            await Question.findByIdAndUpdate(questionId, {
              $inc: { usageCount: 1, incorrectCount: 1 },
              $set: { lastAttempted: new Date() },
            });
          }

          // Update the question object with the evaluation results
          return {
            ...q,
            isCorrect,
            feedback,
          };
        })
      );

      // Calculate the percentage score
      const totalQuestions = examSession.questions.length;
      const percentage = (correctAnswersCount / totalQuestions) * 100;

      // Determine if the user passed or failed (e.g., pass if 40% or higher)
      const isPass = percentage >= 40;

      // Update the exam session in the database with the evaluated answers and end time
      await ExamSession.findByIdAndUpdate(examSession._id, {
        questions: examSession.questions,
        endTime: examSession.endTime,
        timeTaken: examSession.timeTaken,
        status: examSession.status,
        startTime: examSession.startTime,
        endTime: examSession.endTime,
      });

      // Create a result object
      const result = new Result({
        userId: examSession.userId._id,
        examSessionId: examSession._id,
        correctAnswers: correctAnswersCount,
        percentage,
        isPass,
        date: new Date(),
      });

      // Save the result to the database
      await result.save();
      const populatedResult = await Result.findOne(result._id)
        .populate({
          path: "examSessionId",
          select:
            "totalQuestions timeTaken duration difficulty topicList subjectId",
          populate: [
            {
              path: "subjectId",
              select: "name",
            },
            {
              path: "topicList",
              select: "name",
            },
          ],
        })
        .populate({ path: "userId", select: "name" });

      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User Completed an Exam ",
      });

      // Save the activity to the database
      await activity.save();

      // Send the updated exam session and result back to the frontend
      res.status(201).json({
        message: "Exam finished successfully",
        populatedResult,
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

export default ExamSessionController;
