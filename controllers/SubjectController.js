import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import Activity from "../models/Activity.js";
import Topic from "../models/Topic.js";
import activityQueue from "../queues/activityQueue.js";
import { randomUUID } from "crypto";
import notificationQueue from "../queues/notificationQueue.js";

class SubjectController {
  //Create New Subject
  static createSubject = async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        message: " Subject name is required",
      });
    }

    //Checks if the Subject Already exists

    const existingSubject = await Subject.findOne({ name: name });
    if (existingSubject) {
      return res.status(400).json({
        message: "Subject already exists",
      });
    }

    //Creating New Subject
    const newSubject = new Subject({
      name: name,
    });

    await newSubject.save();

    //send notification

    const notificationId = randomUUID();
    const title = "Subject added";
    const message = `A new subject "${newSubject.name}" is added `;

    await notificationQueue.add(
      "sendNotification",
      { notificationId, title, message, userId: "users" },
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

    //Activity
    const activityId = randomUUID();
    const action = "Admin added new Subject";

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
      message: "Subject added Successfully",
      newSubject,
    });
  };

  //Get All Subjects

  static getSubjects = async (req, res) => {
    const subjects = await Subject.aggregate([
      {
        $lookup: {
          from: "topics", // collection name in MongoDB
          localField: "_id",
          foreignField: "subjectId",
          as: "topics",
        },
      },
      {
        $addFields: {
          topicCount: { $size: "$topics" }, // count topics
        },
      },
      {
        $sort: { topicCount: -1 }, // most topics first
      },
      {
        $project: {
          topics: 0, // exclude topics array
        },
      },
    ]);

    res.status(200).json(subjects);
  };

  //Deleting Subject

  static deleteSubject = async (req, res) => {
    const { subjectId } = req.params;

    //Checking if the subject exists
    const subject = await Subject.findOne({ _id: subjectId });

    if (!subject) {
      return res.status(404).json({
        message: "Subject not found",
      });
    }

    //send notification

    const notificationId = randomUUID();
    const title = "Subject deleted";
    const message = `${req.user.role} deleted subject "${subject.name}"  `;
    await notificationQueue.add(
      "sendNotification",
      { notificationId, title, message, receiver : "users" },
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

    //Deleting Subject
    await Subject.deleteOne({ _id: subjectId });
    await Topic.deleteMany({ subjectId: subjectId });
    await Question.deleteMany({ subjectId: subjectId });

    //Activity
    const activityId = randomUUID();
    const action = "Admin deleted a subject";

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

    res.status(200).json({
      message:
        "Subject its topics and related questions are deleted Successfully",
      deleteSubjectId: subject._id,
    });
  };
}

export default SubjectController;
