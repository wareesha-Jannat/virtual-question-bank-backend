import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
    required: true,
  },
});

topicSchema.index({ name: 1, subjectId: 1 }, { unique: true });
const Topic = mongoose.model("Topic", topicSchema);

export default Topic;
