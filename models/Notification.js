import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true,
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  receiverId: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  isReadBy: { type: [mongoose.Schema.Types.ObjectId], default: [] }, // Array of ObjectIds
});
const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
