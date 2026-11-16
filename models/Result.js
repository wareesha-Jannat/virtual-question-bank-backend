import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  examSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExamSession",
    required: true,
  },
  correctAnswers: { type: Number, required: true },
  percentage: { type: Number, min: 0, max: 100, required: true },
  isPass: { type: Boolean, required: true },
  date: { type: Date, default: Date.now },
});
resultSchema.index({ userId: 1, _id: -1 });
const Result = mongoose.model("Result", resultSchema);
export default Result;
