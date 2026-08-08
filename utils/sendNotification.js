import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Function to create and send notifications
export const sendNotification = async ({
  notificationId,
  title,
  message,
  receiver,
  userId,
}) => {
  let recipientIds = [];

  const existing = await Notification.findOne({ notificationId });
  if (existing) {
    return;
  }
  // If a specific user ID is provided, send the notification to that user only
  if (userId) {
    recipientIds.push(userId);
  } else if (receiver === "users") {
    // Fetch all users if "All Users" is selected
    const users = await User.find({}, "_id");
    recipientIds = users.map((user) => user._id);
  } else if (receiver === "Admin" || receiver === "Student") {
    // Fetch users based on their roles (e.g., Admin or Student)
    const users = await User.find({ role: receiver }, "_id");
    recipientIds = users.map((user) => user._id);
  }
  // If neither a userId nor a receiver is specified, throw an error
  else {
    throw new Error(
      "You must specify either a userId or a receiver to send a notification.",
    );
  }

  // Create the new notification
  const newNotification = new Notification({
    notificationId,
    title,
    message,
    receiverId: recipientIds,
  });

  // Save the notification to the database
  await newNotification.save();
};
