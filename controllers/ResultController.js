import Result from "../models/Result.js";
import ExamSession from "../models/ExamSession.js";
import mongoose from "mongoose";
class ResultController {
  //getResult
  static getResultsByUser = async (req, res) => {
    try {
      const userId = req.user._id;
      const { cursor = null, search = "" } = req.query;
      const pageSize = 10;

      const query = {
        userId,
        ...(search && { subject: { $regex: search, $options: "i" } }),
        ...(cursor && {
          _id: { $lt: new mongoose.Types.ObjectId(String(cursor)) },
        }),
      };
      const results = await Result.find(query)
        .populate({
          path: "examSessionId",
          select: "subjectId topicList",
          match: search
            ? {
                subjectId: {
                  $exists: true,
                },
              }
            : {},
          populate: [
            {
              path: "subjectId",
              select: "name",
              match: search ? { name: { $regex: search, $options: "i" } } : {}, // Filter subject here!
            },
            {
              path: "topicList",
              select: "name",
            },
          ],
        })
        .select("percentage isPass examSessionId date")
        .sort({ _id: -1 })
        .limit(pageSize + 1);

      // Format results for the frontend
      const formattedResults = results.map((result) => ({
        resultId: result._id,
        examSessionId: result.examSessionId._id,
        subjectName: result.examSessionId.subjectId.name,
        date: result.date,
        isPass: result.isPass,
        topics: result.examSessionId.topicList
          ?.map((topic) => topic.name)
          .join(", "),
        percentage: result.percentage,
      }));

      const hasMore = formattedResults.length > pageSize;
      const nextCursor = hasMore ? results[pageSize]._id.toString() : null;
      const finalResults = hasMore
        ? formattedResults.slice(0, pageSize)
        : formattedResults;

      return res.status(200).json({
        results: finalResults,
        nextCursor,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error",
      });
    }
  };

  //get single result
  static getSingleResult = async (req, res) => {
    try {
      const resultId = req.body;

      const populatedResult = await Result.findOne({ _id: resultId.resultId })
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
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };

  //get detail result
  static getDetailResult = async (req, res) => {
    try {
      const { examSessionId } = req.body;

      const exam = await ExamSession.findById(examSessionId)
        .populate({
          path: "questions.questionId",
          select: "questionText options questionType correctAnswer explanation",
        })
        .select("startTime endTime questions");

      res.status(200).json(exam);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  };
}

export default ResultController;
