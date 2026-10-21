import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

import "dotenv/config";

const pool = mysql.createPool({
  host: process.env.DB_HOST!,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: ['DATE'],
});

export const db = drizzle(pool, { schema, mode: "default" });

// Export unified database instance and pool
export { pool };
export const salesDb = db;
export const salesPool = pool;
