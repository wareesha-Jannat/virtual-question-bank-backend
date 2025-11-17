import mongoose from "mongoose";

// Function to make connection to database
const connectDb = async (DATABASE_URL) => {
  try {
    // Database options
    const DB_OPTIONS = {
      dbName: "VirtualQuestionBank",
    };
    await mongoose.connect(DATABASE_URL, DB_OPTIONS);
  } catch (err) {}
};
export default connectDb;
