import Topic from "../models/Topic.js";
import Subject from "../models/Subject.js";
import Question from "../models/Question.js";
import { randomUUID } from "crypto";
import activityQueue from "../queues/activityQueue.js";
import notificationQueue from "../queues/notificationQueue.js";

class TopicController {
  //Get Topics
  static getTopics = async (req, res) => {
    const { subjectId } = req.query;

    if (!subjectId) {
      res.status(400).json({
        message: "Subject is required",
      });
    }

    let topics = await Topic.find({ subjectId }).populate("subjectId").lean();

    if (!topics || topics.length === 0) {
      return res
        .status(404)
        .json({ message: "No topics found for this subject" });
    }

    // 2. Count questions for each topic
    const topicIds = topics.map((t) => t._id);
    const questionCounts = await Question.aggregate([
      { $match: { topicId: { $in: topicIds } } },
      { $group: { _id: "$topicId", count: { $sum: 1 } } },
    ]);

    const countMap = Object.fromEntries(
      questionCounts.map((qc) => [qc._id.toString(), qc.count]),
    );

    // 3. Attach questionCount to all topics (including those with 0)
    topics = topics.map((topic) => ({
      ...topic,
      questionCount: countMap[topic._id.toString()] || 0,
    }));

    // 4. Sort by questionCount descending
    topics.sort((a, b) => b.questionCount - a.questionCount);

    res.status(200).json(topics);
  };

  //Adding new Topic
  static addTopic = async (req, res) => {
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

    const notificationId = randomUUID();
    const title = "Topic added";
    const message = `A new topic "${newTopic.name}" is added to subject "${subject.name}" `;
    await notificationQueue.add(
      "sendNotification",
      { notificationId, title, message, receiver: "users" },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );

    // update activity
    const activityId = randomUUID();
    const action = "Admin added new topic";

    await activityQueue.add(
      "addActivity",
      { activityId, user: req.user._id, role: req.user.role, action },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    res.status(201).json({
      message: "Topic added Successfully",
      newTopic,
      subjectId,
    });
  };

  //Deleting topic

  static deleteTopic = async (req, res) => {
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
    const activityId = randomUUID();
    const action = "User deleted topic";

    await activityQueue.add(
      "addActivity",
      { activityId, user: req.user._id, role: req.user.role, action },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );

    return res.status(200).json({
      message: "topic and its related questions are deleted Successfully",
      topicId: topic._id,
      subjectId: topic.subjectId,
    });
  };
}
export default TopicController;
