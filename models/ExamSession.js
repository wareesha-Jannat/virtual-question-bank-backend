import mongoose from "mongoose";

const examSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user

  // Snapshot strings — session is self-sufficient even if subject/topics are deleted later
  subjectName: { type: String }, // snapshot of subject name at exam creation
  topicNames: [{ type: String }], // snapshot of topic names at exam creation

  totalQuestions: { type: Number, required: true }, // Total number of questions in the exam
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard", "All"],
    required: true,
  }, // Difficulty level
  questions: [
    {
      // ── Snapshot fields copied from Question at exam start ──
      
      questionText: { type: String, required: true },
      questionType: {
        type: String,
        enum: ["MCQ", "Descriptive"],
        required: true,
      },
      options: [{ type: String }], // MCQ only
      correctAnswer: { type: String, required: true },
      explanation: { type: String },
      keywords: [{ type: String }], // Descriptive only — used for evaluation in finishExam

      // ── Per-attempt fields written by finishExam ──
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
  }, // Status of the exam session — "Canceled" with single L
  startTime: { type: Date }, // Start time of the exam
  endTime: { type: Date }, // End time of the exam
});
examSessionSchema.index({ userId: 1, subjectName: 1 });
const ExamSession = mongoose.model("ExamSession", examSessionSchema);

export default ExamSession;
