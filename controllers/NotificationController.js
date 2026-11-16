import Notification from "../models/Notification.js";
import { sendNotification } from "../utils/sendNotification.js";

class NotificationController {
  // create Notifications
  static createNotification = async (req, res) => {
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
  };

  //get Notifications
  static getNotifications = async (req, res) => {
    const userId = req.user._id;
    const notifications = await Notification.find({
      receiverId: userId,
    }).sort({ createdAt: -1 }); // Sort by most recent notifications descending order
    return res.status(200).json({ notifications, userId });
  };

  //mark as read
  static markAsRead = async (req, res) => {
    const userId = req.user._id;
    const { notificationId } = req.params;
    const updatedNotification = await Notification.findByIdAndUpdate(
      { _id: notificationId, receiverId: userId },
      {
        $set: { isReadBy: true },
      },
      { new: true },
    );
    res.status(200).json({
      message: "Updation successfull",
      notification: updatedNotification,
    });
  };

  //check unread notifications

  static checkUnreadNotifications = async (req, res) => {
    const userId = req.user._id;
    const hasUnread = await Notification.exists({  //return doc's id if match exist otherwise null
      receiverId: userId,
      isReadBy: false,
    });

    res.status(200).json({ hasUnread: !!hasUnread }); // `!!` converts the result to a boolean
  };
}

export default NotificationController;
