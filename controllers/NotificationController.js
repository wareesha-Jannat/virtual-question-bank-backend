import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendNotification } from "../utils/sendNotification.js";
class NotificationController {
  // create Notifications
  static createNotification = async (req, res) => {
    try {
      const { title, message, receiver } = req.body;

      // Basic validation
      if (!title || !message || !receiver) {
        return res.status(400).json({
          message: "Title, message, and receiver are required fields.",
        });
      }
      // calling send  Notification to send Notification
      await sendNotification({ title, message, receiver });

      return res.status(201).json({
        message: "Notification sent successfully!",
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };

  //get Notifications
  static getNotifications = async (req, res) => {
    const userId = req.user._id;

    try {
      const notifications = await Notification.find({
        receiverId: userId,
      }).sort({ createdAt: -1 }); // Sort by most recent notifications descending order

      return res.status(200).json({ notifications, userId });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching notifications" });
    }
  };

  //mark as read
  static markAsRead = async (req, res) => {
    try {
      const userId = req.user._id;
      const { notificationId } = req.params;
      const updatedNotification = await Notification.findByIdAndUpdate(
        notificationId,
        {
          $addToSet: { isReadBy: userId }, //addtoset adds value if it does not exist already
        },
        { new: true }
      );
      res.status(200).json({
        message: "Updation successfull",
        notification: updatedNotification,
      });
    } catch (error) {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  };

  //check unread notifications

  static checkUnreadNotifications = async (req, res) => {
    try {
      const userId = req.user._id;
      const hasUnread = await Notification.exists({
        receiverId: userId,
        isReadBy: { $nin: [userId] }, // Check if the `isReadBy` array does NOT include the userId
      });

      res.status(200).json({ hasUnread: !!hasUnread }); // `!!` converts the result to a boolean
    } catch (error) {
      res.status(500).json({
        message: "Server error while checking for unread notifications",
      });
    }
  };
}

export default NotificationController;
