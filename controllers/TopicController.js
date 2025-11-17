import Topic from "../models/Topic.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import { sendNotification } from "../utils/sendNotification.js";
import Activity from "../models/Activity.js";

class TopicController {
  //Get Topics
  static getTopics = async (req, res) => {
    try {
      const { subjectId } = req.query;

      if (!subjectId) {
        res.status(400).json({
          message: "Subject is required",
        });
      }

      const topics = await Topic.find({ subjectId }).populate("subjectId");

      if (!topics) {
        res.status(404).json({
          message: "No topics found for this subject",
        });
      }
      res.status(200).json(topics);
    } catch (err) {
      res.status(500).json({
        message: "Could not get Topics, internal server error",
      });
    }
  };

  //Adding new Topic
  static addTopic = async (req, res) => {
    try {
      const { subjectId, topic } = req.body;

      //Checking if input fields are empty
      if (!subjectId || !topic) {
        return res
          .status(400)
          .json({ message: "Subject and Topic are required" });
      }

      //Checking if subject exists
      const subject = await Subject.findById(subjectId);

      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }
      //Checking if the topic exists
      const existingTopic = await Topic.findOne({ name: topic });

      if (existingTopic) {
        return res.status(404).json({ message: "topic already exists" });
      }
      //Adding new topic
      const newTopic = new Topic({
        name: topic,
        subjectId: subjectId,
      });
      await newTopic.save();

      //send notification
      const title = "Topic Added";
      const message = `A new topic "${newTopic.name}" is added to subject "${subject.name}" `;
      const receiver = "users";
      await sendNotification({ title, message, receiver });

      // update activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User added new Topic",
      });

      // Save the activity to the database
      await activity.save();
      res.status(201).json({
        message: "Topic added Successfully",
        newTopic,
        subjectId
      });
    } catch (err) {
      return res.status(500).json({
        message: "Could not add Topic server error",
      });
    }
  };

  //Deleting topic

  static deleteTopic = async (req, res) => {
    try {
      const { topicId } = req.params;

      //Checking if the topic exists
      const topic = await Topic.findOne({ _id: topicId });

      if (!topic) {
        return res.status(404).json({
          message: "topic Does not exist",

        });
      }

      //Deleting topic
      await Topic.deleteOne({ _id: topicId });
      await Question.deleteMany({ topicId });

      //Activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User deleted a topic",
      });

      // Save the activity to the database
      await activity.save();

      return res.status(200).json({
        message: "topic and its related questions are deleted Successfully",
        topicId : topic._id,
        subjectId : topic.subjectId
      });
    } catch (err) {
      res.status(500).json({
        message: "Server error, unable to delete topic",
      });
    }
  };
}
export default TopicController;
