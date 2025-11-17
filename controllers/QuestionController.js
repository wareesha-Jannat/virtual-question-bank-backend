import Question from "../models/Question.js";
import { sendNotification } from "../utils/sendNotification.js";
import Activity from "../models/Activity.js";
import Subject from "../models/Subject.js";
import Topic from "../models/Topic.js";
import natural from "natural";
import { removeStopwords } from "stopword";
import User from "../models/User.js";
import mongoose from "mongoose";

class QuestionController {
  // Function to extract keywords from a correct answer
  static extractKeywords = (correctAnswer) => {
    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(correctAnswer);

    // Remove stopwords like 'the', 'is', 'and', etc.
    const filteredWords = removeStopwords(words);

    // Return all keywords without sorting or limiting
    return filteredWords;
  };

  // Add Question Method
  static addQuestion = async (req, res) => {
    try {
      const {
        questionText,
        questionType,
        options,
        correctAnswer,
        difficultyLevel,
        subject,
        topic,
        explanation,
      } = req.body;
      const createdBy = req.user._id;

      // Checking required fields
      if (
        !questionText ||
        !questionType ||
        !correctAnswer ||
        !difficultyLevel ||
        !subject ||
        !topic
      ) {
        return res.status(400).json({
          message: "All required fields must be filled",
        });
      }

      // Check if it's MCQ and if options are provided
      if (questionType === "MCQ" && (!options || options.length === 0)) {
        return res.status(400).json({
          message: "Options are required",
        });
      }

      // Check if the question already exists
      const existingQuestion = await Question.findOne({
        questionText,
        questionType,
        subjectId: subject,
        topicId: topic,
      });

      if (existingQuestion) {
        return res.status(400).json({
          message: "Question already exists for this subject and topic.",
        });
      }

      // Retrieve the subject and topic names
      const subjectData = await Subject.findById(subject);
      const topicData = await Topic.findById(topic);

      const subjectName = subjectData ? subjectData.name : "Unknown Subject";
      const topicName = topicData ? topicData.name : "Unknown Topic";

      // Create question data object
      const questionData = {
        questionText,
        questionType,
        correctAnswer,
        difficultyLevel,
        subjectId: subject,
        topicId: topic,
        explanation,
        createdBy,
      };

      // Options field will only be included if the type of question is MCQ
      if (questionType === "MCQ") {
        questionData.options = options;
      }

      // Extract keywords if the question type is descriptive
      if (questionType === "Descriptive") {
        questionData.keywords =
          QuestionController.extractKeywords(correctAnswer);
      }

      // Add new question
      const newQuestion = new Question(questionData);
      await newQuestion.save();

      // Create a notification message with subject and topic names
      const title = "Question Added";
      const message = `A new question has been added for the subject "${subjectName}" and topic "${topicName}".`;
      const receiver = "users";

      // Send notification
      await sendNotification({ title, message, receiver });
      // store activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User added new Question",
      });

      // Save the activity to the database
      await activity.save();
      return res.status(201).json({
        success: true,
        message: "Question added successfully",
        newQuestion,
      });
    } catch (err) {
      return res.status(500).json({
        message: "Could not add Question, server error",
      });
    }
  };

  //Get questions by Admin
  static getQuestionsByAdmin = async (req, res) => {
    try {
      const createdBy = req.user._id;
      const { page = 1, limit = 10, search = "", subjectId = "" } = req.query;
      const numericLimit = parseInt(limit);
      const skip = (page - 1) * numericLimit;

      const query = {
        createdBy,
        ...(search && { questionText: { $regex: search, $options: "i" } }),
        ...(subjectId && { subjectId }),
      };

      const questions = await Question.find(query)
        .populate("subjectId topicId")
        .select(
          "questionText questionType difficultyLevel subjectId topicId correctAnswer options explanation"
        )
        .skip(skip)
        .limit(numericLimit)
        .sort({ createdAt: -1 });
      const total = await Question.countDocuments(query);

      res.status(200).json({
        totalPages: Math.ceil(total / numericLimit),
        currentPage: Number(page),
        questions,
      });
    } catch (error) {
      res.status(500).json({
        message: "Could not get questions, internal server error",
      });
    }
  };

  //Get specific questions for question page
  static getQuestionPageQuestions = async (req, res) => {
    const {
      subjectId,
      topicId,
      search = "",
      difficulty = "",
      cursor = null,
    } = req.query; // Destructure subjectId and topicId from query parameters

    try {
      // Validate inputs
      if (!subjectId || !topicId) {
        return res
          .status(400)
          .json({ message: "subjectId and topicId are required" });
      }
      const pageSize = 7;

      const query = {
        topicId,
        subjectId,
        ...(search && { questionText: { $regex: search, $options: "i" } }),
        ...(difficulty && { difficultyLevel: difficulty }),
        ...(cursor && {
          _id: { $lt: new mongoose.Types.ObjectId(String(cursor)) },
        }),
      };
      // Fetch questions from the database based on subjectId and topicId
      const questions = await Question.find(query)
        .select(
          "questionText questionType difficultyLevel options correctAnswer explanation "
        )
        .sort({ _id: -1 })
        .limit(pageSize + 1);

      const hasMore = questions.length > pageSize;
      const nextCursor = hasMore ? questions[pageSize]._id.toString() : null;
      const finalQuestions = hasMore ? questions.slice(0, pageSize) : questions;

      // Send response with the questions
      return res.status(200).json({
        nextCursor,
        questions: finalQuestions,
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error", error });
    }
  };

  //Update Question
  static updateQuestion = async (req, res) => {
    try {
      const { questionId } = req.params;
      const {
        questionText,
        questionType,
        options,
        correctAnswer,
        difficultyLevel,
        subject,
        topic,
        explanation,
      } = req.body;

      //Checking required fields
      if (
        !questionText ||
        !questionType ||
        !correctAnswer ||
        !difficultyLevel ||
        !subject ||
        !topic
      ) {
        return res.status(400).json({
          message: "All required fields must be filled",
        });
      }
      // Check if it's MCQ and if options are provided
      if (questionType === "MCQ" && (!options || options.length === 0)) {
        return res.status(400).json({
          message: "Option are required",
        });
      }

      //Creating question data object
      const questionData = {
        questionText,
        questionType,
        correctAnswer,
        difficultyLevel,
        subjectId: subject,
        topicId: topic,
        explanation,
      };
      //Options field will only be included if the type of question is MCQ
      if (questionType === "MCQ") {
        questionData.options = options;
      }

      // Find the question by ID and update it
      const updatedQuestion = await Question.findByIdAndUpdate(
        questionId,
        questionData,
        { new: true } // Return the updated document
      );

      if (!updatedQuestion) {
        return res.status(404).json({ message: "Question not found" });
      }
      //Activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User updated a Question",
      });

      // Save the activity to the database
      await activity.save();

      // Return the updated question
      res.status(200).json({
        message: "Question updated successfully",
        success: true,
        updatedQuestion,
      });
    } catch (error) {
      res.status(500).json({
        message: "internal server error , cannot update question",
      });
    }
  };

  //Delete Question
  static deleteQuestion = async (req, res) => {
    try {
      const { questionId } = req.params;
      const question = await Question.findOne({ _id: questionId });
      if (!question) {
        return res.status(404).json({
          message: "Question not found",
        });
      }
      await Question.deleteOne({ _id: questionId });
      //Activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User deleted a Question",
      });

      // Save the activity to the database
      await activity.save();
      res.status(200).json({
        success: true,
        message: "Question deleted Successfully",
        questionId,
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error, cannot delete question",
      });
    }
  };

  // Evaluate Response
  static evaluateResponse = async (req, res) => {
    const { userAnswer, selectedQuestionId } = req.body;

    try {
      // Find the question by ID
      const question = await Question.findById(selectedQuestionId);
      const user = await User.findById(req.user._id);
      let isCorrect = false;

      // Evaluate based on question type
      if (question.questionType === "MCQ") {
        // Check if the user's answer matches the correct answer for MCQ
        isCorrect = userAnswer.trim() === question.correctAnswer.trim();
      } else if (question.questionType === "Descriptive") {
        // For descriptive questions, check if the userAnswer contains the required keywords
        const lowercasedAnswer = userAnswer.trim().toLowerCase();
        const matchedKeywords = question.keywords.filter((keyword) =>
          lowercasedAnswer.includes(keyword.trim().toLowerCase())
        );

        // Determine if the answer is correct based on the number of matched keywords
        // Here, we assume an answer is correct if it contains at 50 percent of the keywords
        const keywordMatchThreshold = question.keywords.length / 2;
        isCorrect = matchedKeywords.length >= keywordMatchThreshold;
      }

      // Update fields in the question object
      question.usageCount += 1;
      question.lastAttempted = new Date();

      if (isCorrect) {
        question.correctCount += 1;
        user.correctAnswers += 1;
      } else {
        question.incorrectCount += 1;
      }

      // Save the updated question
      await question.save();
      //updating practice question count

      user.practiceQuestionCount += 1;
      await user.save();
      // Send response back with evaluation result
      res.status(200).json({ isCorrect: isCorrect });
    } catch (error) {
      res
        .status(500)
        .json({ message: "An error occurred while evaluating the response" });
    }
  };
}
export default QuestionController;
