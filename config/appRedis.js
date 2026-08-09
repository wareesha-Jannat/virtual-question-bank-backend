import IORedis from "ioredis";
import dotenv from "dotenv";
dotenv.config();

const connection = new IORedis(process.env.REDIS_URL);

export default connection;
