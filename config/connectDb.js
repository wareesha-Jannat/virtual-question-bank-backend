import mongoose from "mongoose";

// Function to make connection to database
const connectDb = async (DATABASE_URL) => {
  try {
   
    await mongoose.connect(DATABASE_URL);
  } catch (err) {
    console.log("error in connecting to db", err)
  }
};
export default connectDb;
