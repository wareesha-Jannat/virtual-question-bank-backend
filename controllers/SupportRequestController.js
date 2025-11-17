import SupportRequest from "../models/SupportRequest.js";
import User from "../models/User.js";
import { sendNotification } from "../utils/sendNotification.js";
import Activity from "../models/Activity.js";
import mongoose from "mongoose";

class SupportRequestController {
  //Create Support REquest
  static createSupportRequest = async (req, res) => {
    try {
      const userId = req.user._id;
      const { subject, messageText } = req.body;

      // Validate required fields
      if (!subject || !messageText) {
        return res
          .status(400)
          .json({
            message: "Subject and message are required",
            success: false,
          });
      }

      // Find all admins
      const admins = await User.find({ role: "Admin" });

      if (admins.length === 0) {
        return res
          .status(404)
          .json({
            message: "No admins available to assign the request",
            success: false,
          });
      }

      // Extract admin IDs
      const adminIds = admins.map((admin) => admin._id);

      // Create the support request
      const newSupportRequest = new SupportRequest({
        userId,
        admins: adminIds, // Store all admin IDs
        respondedAdminId: null, // Initially, no admin has responded
        subject,
        message: messageText,
        responseText: "", // Leave empty for now
        status: "pending", // Initial status of the support request
      });

      // Save to the database
      await newSupportRequest.save();

      // Create a notification message with subject and topic names
      const title = "Support request created";
      const message =
        "A new Support request is created. Please respond to the request from user";
      const receiver = "Admin";

      // Send notification
      await sendNotification({ title, message, receiver });

      // create activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User made a support request",
      });

      // Save the activity to the database
      await activity.save();

      // Send success response
      return res
        .status(201)
        .json({
          message: "Support request created successfully",
          success: true,
          newSupportRequest,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          message: "Server error, please try again later",
          success: false,
        });
    }
  };
  //get user support requests
  static getUserSupportRequests = async (req, res) => {
    try {
      const userId = req.user._id;
      const { cursor = null, search = "" } = req.query;
      const pageSize = 7;
      const query = {
        userId,
        ...(cursor && {
          _id: { $lt: new mongoose.Types.ObjectId(String(cursor)) },
        }),
        ...(search && {
          $or: [
            { subject: { $regex: search, $options: "i" } },
            { message: { $regex: search, $options: "i" } },
          ],
        }),
      };
      // Find all support requests where the logged-in user is the requester
      const userRequests = await SupportRequest.find(query)
        .populate("respondedAdminId", "name")
        .sort({ _id: -1 })
        .limit(pageSize + 1)
        .lean();
      const nextCursor =
        userRequests.length > pageSize
          ? userRequests[pageSize]._id.toString()
          : null;
      const requests =
        userRequests.length > pageSize
          ? userRequests.slice(0, pageSize)
          : userRequests;
      // Send success response with the requests
      return res.status(200).json({
        requests,
        nextCursor,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Server error, please try again later" });
    }
  };

  static deleteRequest = async (req, res) => {
    try {
      const { reqId } = req.query;
      if (!reqId) {
        return res.status(400).json({ message: "requestID is required" });
      }

      const result = await SupportRequest.deleteOne({ _id: reqId });
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Request not found",
        });
      }

      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "Admin deleted a request",
      });

      // Save the activity to the database
      await activity.save();

      return res.status(200).json({
        message: "Request deleted successfully",
        success: true,
        reqId,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          message: "Server error, please try again later",
          success: false,
        });
    }
  };

  static getUserRespondedRequests = async (req, res) => {
    try {
      const userId = req.user._id;
      const { cursor = null, search = "" } = req.query;
      const pageSize = 7;
      const query = {
        respondedAdminId: userId,
        ...(cursor && {
          _id: { $lt: new mongoose.Types.ObjectId(String(cursor)) },
        }),
        ...(search && {
          $or: [
            { subject: { $regex: search, $options: "i" } },
            { message: { $regex: search, $options: "i" } },
          ],
        }),
      };

      // Find requests where the user is the responder
      const respondedRequests = await SupportRequest.find(query)
        .populate("userId", "name")
        .sort({ _id: -1 })
        .limit(pageSize + 1)
        .lean();

      const nextCursor =
        respondedRequests.length > pageSize
          ? respondedRequests[pageSize]._id.toString()
          : null;
      const requests =
        respondedRequests.length > pageSize
          ? respondedRequests.slice(0, pageSize)
          : respondedRequests;

      // Send success response with the combined requests
      return res.status(200).json({
        requests,
        nextCursor,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Server error, please try again later",
        success: false,
      });
    }
  };

  static getNewRequests = async (req, res) => {
    try {
      // Find new requests that have no respondedAdminId (i.e., no admin has responded yet)
      const newRequests = await SupportRequest.find({
        respondedAdminId: null,
      }).populate("userId", "name"); //populate user info

      // Combine both responded and new requests into one object
      const result = {
        newRequests,
      };

      // Send success response with the combined requests
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        message: "Server error, please try again later",
        success: false,
      });
    }
  };

  //Response to support request

  static respondToSupportRequest = async (req, res) => {
    try {
      const { requestId, responseText } = req.body;
      const userId = req.user._id;

      // Find the support request by ID
      const supportRequest = await SupportRequest.findById(requestId);

      if (!supportRequest) {
        return res.status(404).json({ message: "Support request not found" });
      }

      // Update the support request with response text, responded admin ID, and status
      supportRequest.responseText = responseText; // Save the response text
      supportRequest.respondedAdminId = userId; // Save the ID of the responding admin
      supportRequest.status = "Responded"; // Update the status

      // Save the updated support request
      await supportRequest.save();

      // Create a notification message with subject and topic names
      const title = "Support request Responded";
      const message = `Admin ${req.user.name} has responded to a support request`;
      const receiver = "Admin";

      // Send notification
      await sendNotification({ title, message, receiver });

      // create activity
      const activity = new Activity({
        user: userId,
        role: req.user.role,
        action: "User responded to a support request",
      });

      // Save the activity to the database
      await activity.save();

      // Send success response
      return res.status(200).json({
        message: "Response submitted successfully",
        supportRequest,
        success: true,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal Server error, please try again later" });
    }
  };
}
export default SupportRequestController;
