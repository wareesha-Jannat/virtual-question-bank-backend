import Result from "../models/Result.js";
import ExamSession from "../models/ExamSession.js";
import mongoose from "mongoose";
class ResultController {
  //getResult
  static getResultsByUser = async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { cursor = null, search = "" } = req.query;
    const pageSize = 10;
    let escapedSearch;

    if (search) {
      escapedSearch = search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";
    }

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

      // Step 6: Optional search filter
      ...(search
        ? [
            {
              $match: {
                "examSession.subjectName": {
                  $regex: escapedSearch,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      { $limit: pageSize + 1 },

      // Step 7: Project only fields needed for frontend
      {
        $project: {
          resultId: "$_id",
          examSessionId: "$examSession._id",
          subjectName: "$examSession.subjectName",
          date: 1,
          isPass: 1,
          percentage: 1,
          topics: "$examSession.topicNames",
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
    console.log(finalResults);
    return res.status(200).json({
      results: finalResults,
      nextCursor,
    });
  };

  //get single result
  static getSingleResult = async (req, res) => {
    const { resultId } = req.params;

    const populatedResult = await Result.findOne({ _id: resultId, userId : new mongoose.Types.ObjectId(req.user._id) })
      .populate({
        path: "examSessionId",
        select:
          "totalQuestions timeTaken duration difficulty subjectName topicNames",
      })
      .populate({ path: "userId", select: "name" });

    return res.status(200).json(populatedResult);
  };

  //get detail result
  static getDetailResult = async (req, res) => {
    const { id: examSessionId } = req.params;

    // No populate needed — all question data (text, options, correctAnswer, explanation)
    // is embedded as a snapshot inside the questions[] array
    const exam = await ExamSession.findOne({
      _id: examSessionId,
      userId: req.user._id,
    }).select("startTime endTime questions");

    res.status(200).json(exam);
  };
}

export default ResultController;
