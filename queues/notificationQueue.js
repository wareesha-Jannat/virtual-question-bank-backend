import { Queue } from "bullmq";
import connection from "../config/appRedis.js";

const notificationQueue = new Queue("notificationQueue", { connection });


export default notificationQueue;
