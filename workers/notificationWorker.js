import { Worker } from "bullmq";
import { sendNotification } from "../utils/sendNotification.js";
import connection from "../config/workerRedis.js";
import connectDb from "../config/connectDb.js";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DB_URL;

await connectDb(DATABASE_URL);

const worker = new Worker(
  "notificationQueue",
  async (job) => {
    console.log(`processing notification job ${job.id}`);
    await sendNotification(job.data);
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`job ${job.id} failed`);
  console.log(err.message);
});

worker.on("error", (job, err) => {
  console.log(`job ${job.id} got error`);
  console.log(err.message);
});
