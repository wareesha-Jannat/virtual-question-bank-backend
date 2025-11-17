import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  }, // Reference to the subject
  topicList: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }], // List of topics covered in the exam
  totalQuestions: { type: Number, required: true }, // Total number of questions in the exam
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard", "All"],
    required: true,
  }, // Difficulty level
  questions: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
      userAnswer: { type: String },
      isCorrect: { type: Boolean },
      feedback: { type: String },
    },
  ],
  duration: { type: Number, required: true }, // Duration of the exam in minutes
  timeTaken: { type: String },
  questionType: {
    type: String,
    enum: ["MCQ", "Descriptive", "Both"],
    required: true,
  }, // Type of questions
  status: {
    type: String,
    enum: ["Active", "Completed", "Canceled"],
    default: "Active",
  }, // Status of the exam session
  startTime: { type: Date }, // Start time of the exam
  endTime: { type: Date }, // End time of the exam
});
examSessionSchema.index({ userId: 1, subjectId: 1 });
const ExamSession = mongoose.model("ExamSession", examSessionSchema);

export default ExamSession;
