import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
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
const Topic = mongoose.model("Topic", topicSchema);

export default Topic;
