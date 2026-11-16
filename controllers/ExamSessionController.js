import Question from "../models/Question.js";
import ExamSession from "../models/ExamSession.js";
import Result from "../models/Result.js";
import Activity from "../models/Activity.js";
import Subject from "../models/Subject.js";
import Topic from "../models/Topic.js";
import { sendNotification } from "../utils/sendNotification.js";

class ExamSessionController {
  //Start Exam
  static startExam = async (req, res) => {
    const userId = req.user._id;
    console.log(userId);
    const {
      subjectId,
      totalQuestions,
      selectedTopics,
      difficulty,
      duration,
      questionType,
    } = req.body;

    if (totalQuestions < 1 || totalQuestions > 50) {
      return res.status(400).json({
        message: "Total Questions must be between 1 and 50",
      });
    }

    // Determine the query filter based on question type
    const baseQueryFilter = {
      subjectId,
      topicId: { $in: selectedTopics },
    };
    // Include the difficulty level only if it is provided and not set to "All"
    if (difficulty && difficulty !== "All") {
      baseQueryFilter.difficultyLevel = difficulty;
    }
    console.log(baseQueryFilter);
    let questions = [];

    if (questionType === "MCQ") {
      questions = await Question.find({
        ...baseQueryFilter,
        questionType: "MCQ",
      }).limit(totalQuestions);
    } else if (questionType === "Descriptive") {
      questions = await Question.find({
        ...baseQueryFilter,
        questionType: "Descriptive",
      }).limit(totalQuestions);
    } else if (questionType === "Both") {
      // Mix MCQs and descriptive questions
      const mcqCount = Math.ceil(totalQuestions * 0.7);
      const descriptiveCount = totalQuestions - mcqCount;
      console.log(
        "mcqcount, descriptivecount, totalQuestions",
        mcqCount,
        descriptiveCount,
        totalQuestions,
      );
      // Fetch both types of questions
      const [mcqQuestions, descriptiveQuestions] = await Promise.all([
        Question.find({
          ...baseQueryFilter,
          questionType: "MCQ",
        }).limit(mcqCount),

        Question.find({
          ...baseQueryFilter,
          questionType: "Descriptive",
        }).limit(descriptiveCount),
      ]);

      questions = [...mcqQuestions, ...descriptiveQuestions];
      console.log("questiuons", questions);
    }

    // Check if there are enough questions to meet the 40% threshold
    if (questions.length < Math.ceil(totalQuestions * 0.6)) {
      return res.status(400).json({
        message:
          "Not enough questions to take the exam. Please adjust your criteria or try with fewer questions.",
      });
    }

    // If not enough questions are fetched, more than threshold but less than total questions — fill gap by repeating
    let selectedQuestions = [];
    if (
      questions.length >= Math.ceil(totalQuestions * 0.6) &&
      questions.length < totalQuestions
    ) {
      selectedQuestions = this.ensureUniqueSelection(questions, totalQuestions);
    } else {
      selectedQuestions = questions.slice(0, totalQuestions);
    }

    // Fetch subject name and topic names as snapshots (self-sufficient even if deleted later)
    const [subjectDoc, topicDocs] = await Promise.all([
      Subject.findById(subjectId, "name"),
      Topic.find({ _id: { $in: selectedTopics } }, "name"),
    ]);
    const subjectName = subjectDoc?.name || "";
    const topicNames = topicDocs.map((t) => t.name);

    // Create a new exam session with embedded question snapshots
    const newExamSession = new ExamSession({
      userId,
      subjectName, // snapshot
      topicNames, // snapshot
      totalQuestions,
      difficulty,
      duration,
      questionType,
      // Embed the full question snapshot
      questions: selectedQuestions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        ...(q.questionType === "MCQ" && { options: q.options || [] }),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        ...(q.questionType === "Descriptive" && {
          keywords: q.keywords || [],
        }),
      })),
    });

    // Save the exam session
    const savedExamSession = await newExamSession.save();

    // Populate the student name used in the active exam UI.
    await savedExamSession.populate([{ path: "userId", select: "name" }]);

    // Strip sensitive fields (correctAnswer, keywords, explanation) before sending to frontend
    // These are stored in DB for evaluation but must NOT be visible during an active exam
    const sessionObj = savedExamSession.toObject();
    sessionObj.questions = sessionObj.questions.map(
      // eslint-disable-next-line no-unused-vars
      ({ correctAnswer, keywords, explanation, ...safeFields }) => safeFields,
    );

    console.log(sessionObj);
    // Respond with the session details (sensitive fields stripped)
    return res.status(201).json(sessionObj);
  };

  // Helper function to ensure the selected questions meet the required count without consecutive duplicates
  static ensureUniqueSelection(questions, totalQuestions) {
    const selectedQuestions = [];

    if (questions.length === 0) {
      return selectedQuestions;
    }

    if (questions.length === 1) {
      return Array(totalQuestions).fill(questions[0]);
    }

    let index = 0;

    // Repeat questions until the required number is met
    while (selectedQuestions.length < totalQuestions) {
      const currentQuestion = questions[index % questions.length];

      // Check the last selected question to avoid duplicates in a row
      if (
        selectedQuestions.length === 0 ||
        selectedQuestions[selectedQuestions.length - 1]._id.toString() !==
          currentQuestion._id.toString() //convert ids to string for comparison
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
    // Destructure the provided examSession object from the request body
    const { sessionId } = req.params;
    const { examSession } = req.body;

    // Find the exam session by ID to ensure it exists in the database
    const existingExamSession = await ExamSession.findById(sessionId);
    console.log("exisiting exam session", existingExamSession);
    if (!existingExamSession) {
      return res.status(404).json({ message: "Exam session not found" });
    }

    if (existingExamSession.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "You are not authorized to finish this exam",
      });
    }

    // Check status — "Canceled" with single L matches the schema enum
    if (examSession.status === "Canceled") {
      await ExamSession.deleteOne({ _id: existingExamSession._id });
      return res.status(200).json({
        message: "Exam cancelled",
      });
    }

    // No populate needed — correctAnswer, keywords, questionType are embedded in the snapshot
    // Build a Map of submitted answers keyed by the subdocument _id
    const submittedAnswers = new Map(
      examSession.questions.map((q) => [
        q._id.toString(), // subdocument _id — matches existingExamSession.questions[i]._id
        q.userAnswer,
      ]),
    );
    console.log("exam answers", submittedAnswers);
    let correctAnswersCount = 0;

    // Evaluate each question using the embedded snapshot data
    const evaluatedQuestions = await Promise.all(
      existingExamSession.questions.map(async (q) => {
        // All question data is directly on q — no q.questionId needed
        const submittedAnswer = submittedAnswers.get(q._id.toString());
        const userAnswer =
          typeof submittedAnswer === "string" ? submittedAnswer.trim() : ""; // Ensure userAnswer is not undefined

        let isCorrect = false;
        let feedback = "";

        if (q.questionType === "MCQ") {
          // For MCQ questions
          isCorrect = userAnswer === q.correctAnswer.trim();
          feedback = isCorrect
            ? "Excellent Performance."
            : `Incorrect. The correct answer is: ${q.correctAnswer}, try again`;
        } else if (q.questionType === "Descriptive") {
          // For Descriptive questions — use embedded keywords
          const keywords = q.keywords || [];
          const matchedKeywords = keywords.filter((keyword) =>
            userAnswer.toLowerCase().includes(keyword.toLowerCase()),
          );

          // Consider it correct if the user's answer contains a majority of the keywords
          const keywordMatchThreshold = 0.6; // 60% of keywords should match
          isCorrect =
            keywords.length > 0 &&
            matchedKeywords.length / keywords.length >= keywordMatchThreshold;
          feedback = isCorrect
            ? "Well done, you covered most of the key points."
            : "Incomplete, try again ";
        }

        // Count the correct answers
        if (isCorrect) {
          correctAnswersCount++;
        }

        // Preserve all embedded snapshot fields; only update the per-attempt fields
        return {
          ...q.toObject(),
          userAnswer,
          isCorrect,
          feedback,
        };
      }),
    );

    // Calculate the percentage score
    const totalQuestions = existingExamSession.questions.length;
    const percentage = (correctAnswersCount / totalQuestions) * 100;

    // Determine if the user passed or failed (pass if 40% or higher)
    const isPass = percentage >= 40;

    // Update the exam session in the database with the evaluated answers and timing
    await ExamSession.findByIdAndUpdate(existingExamSession._id, {
      questions: evaluatedQuestions,
      timeTaken: examSession.timeTaken,
      status: examSession.status,
      startTime: examSession.startTime,
      endTime: examSession.endTime,
    });

    // Create a result object
    const result = new Result({
      userId: existingExamSession.userId._id,
      examSessionId: existingExamSession._id,
      correctAnswers: correctAnswersCount,
      percentage,
      isPass,
      date: new Date(),
    });

    // Save the result to the database
    await result.save();
    await result.populate([
      {
        path: "examSessionId",
        select:
          "totalQuestions timeTaken duration difficulty subjectName topicNames",
      },
      {
        path: "userId",
        select: "name",
      },
    ]);

    const activity = new Activity({
      user: req.user._id,
      role: req.user.role,
      action: "User Completed an Exam ",
    });

    // Save the activity to the database
    await activity.save();

    const title = "Exam Result Available in Result Tab";
    const message = `Congratulations🎉 ${result.userId.name} on the completion of exam. The result of your exam is available in result tab`;

    // Send notification
    await sendNotification({ title, message, userId: req.user._id });

    // Send the updated exam session and result back to the frontend
    return res.status(201).json({
      message: "Exam finished successfully",
      result,
    });
  };
}

export default ExamSessionController;
