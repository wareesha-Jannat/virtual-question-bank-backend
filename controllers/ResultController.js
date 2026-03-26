import Result from "../models/Result.js";
import ExamSession from "../models/ExamSession.js";
import mongoose from "mongoose";
class ResultController {
  //getResult
  static getResultsByUser = async (req, res) => {
    const userId = req.user._id;
    const { cursor = null, search = "" } = req.query;
    const pageSize = 10;

    // Cursor filter
    const cursorFilter = cursor
      ? { _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
      : {};

    // Build aggregation pipeline
    const pipeline = [
      // Step 1: Filter by user and optional cursor
      { $match: { userId, ...cursorFilter } },

      // Step 2: Sort by newest first
      { $sort: { _id: -1 } },

      // Step 3: Limit +1 to check if there is a next page
      { $limit: pageSize + 1 },

      // Step 4: Join ExamSession
      {
        $lookup: {
          from: "examsessions",
          localField: "examSessionId",
          foreignField: "_id",
          as: "examSession",
        },
      },
      { $unwind: "$examSession" },

      // Step 5: Join Subject
      {
        $lookup: {
          from: "subjects",
          localField: "examSession.subjectId",
          foreignField: "_id",
          as: "subject",
        },
      },
      { $unwind: "$subject" },

      // Step 6: Optional search filter
      ...(search
        ? [
            {
              $match: {
                "subject.name": { $regex: search, $options: "i" },
              },
            },
          ]
        : []),

      // Step 7: Join topics
      {
        $lookup: {
          from: "topics",
          localField: "examSession.topicList",
          foreignField: "_id",
          as: "topics",
        },
      },

      // Step 8: Project only fields needed for frontend
      {
        $project: {
          resultId: "$_id",
          examSessionId: "$examSession._id",
          subjectName: "$subject.name",
          date: 1,
          isPass: 1,
          percentage: 1,
          topics: "$topics.name",
        },
      },
    ];

    let results = await Result.aggregate(pipeline);

    // Format topics as comma-separated string
    results = results.map((r) => ({
      ...r,
      topics: r.topics?.join(", "),
    }));

    // Handle pagination cursor
    const hasMore = results.length > pageSize;
    const finalResults = hasMore ? results.slice(0, pageSize) : results;
    const nextCursor = hasMore
      ? finalResults[finalResults.length - 1].resultId.toString()
      : null;

    return res.status(200).json({
      results: finalResults,
      nextCursor,
    });
  };

  //get single result
  static getSingleResult = async (req, res) => {
    const { resultId } = req.params;

    const populatedResult = await Result.findOne({ _id: resultId })
      .populate({
        path: "examSessionId",
        select:
          "totalQuestions timeTaken duration difficulty topicList subjectId",
        populate: [
          {
            path: "subjectId",
            select: "name",
          },
          {
            path: "topicList",
            select: "name",
          },
        ],
      })
      .populate({ path: "userId", select: "name" });

    return res.status(200).json(populatedResult);
  };

  //get detail result
  static getDetailResult = async (req, res) => {
    const { id: examSessionId } = req.params;

    const exam = await ExamSession.findById(examSessionId)
      .populate({
        path: "questions.questionId",
        select: "questionText options questionType correctAnswer explanation",
      })
      .select("startTime endTime questions");

    res.status(200).json(exam);
  };
}

export default ResultController;
