import Question from "../models/Question.js";
import Subject from "../models/Subject.js";
import Activity from "../models/Activity.js";
import Topic from "../models/Topic.js";
import { sendNotification } from "../utils/sendNotification.js";

class SubjectController {
  //Create New Subject
  static createSubject = async (req, res) => {
    try {
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
      const title = "Subject Added";
      const message = `A new subject "${newSubject.name}" is added `;
      const receiver = "users";

      await sendNotification({ title, message, receiver });

      // store activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User added new Subject",
      });

      // Save the activity to the database
      await activity.save();

      res.status(201).json({
        message: "Subject added Successfully",
        newSubject,
      });
    } catch (err) {
      res.status(500).json({
        message: "Could not add subject server error",
      });
    }
  };

  //Get All Subjects

  static getSubjects = async (req, res) => {
    try {
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
    } catch (err) {
      res.status(500).json({
        message: "Could not get subjects, internal server error",
      });
    }
  };

  //Deleting Subject

  static deleteSubject = async (req, res) => {
    try {
      const { subjectId } = req.params;

      //Checking if the subject exists
      const subject = await Subject.findOne({ _id: subjectId });

      if (!subject) {
        return res.status(404).json({
          message: "Subject not found",
        });
      }

      //send notification
      const title = "Subject deleted";
      const message = `${req.user.role} deleted subject "${subject.name}"  `;
      const receiver = "users";

      await sendNotification({ title, message, receiver });
      //Deleting Subject
      await Subject.deleteOne({ _id: subjectId });
      await Topic.deleteMany({ subjectId: subjectId });
      await Question.deleteMany({ subjectId: subjectId });

      //store activity
      const activity = new Activity({
        user: req.user._id,
        role: req.user.role,
        action: "User deleted a Subject",
      });

      // Save the activity to the database
      await activity.save();
      res.status(200).json({
        message:
          "Subject its topics and related questions are deleted Successfully",
        deleteSubjectId: subject._id,
      });
    } catch (err) {
      res.status(500).json({
        message: "Server error, unable to delete subject",
      });
    }
  };
}

export default SubjectController;
