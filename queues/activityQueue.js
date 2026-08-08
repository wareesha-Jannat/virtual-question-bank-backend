import { Queue } from "bullmq";
import connection from "../config/appRedis.js";

const activityQueue = new Queue("activityQueue", { connection });

export default activityQueue;
