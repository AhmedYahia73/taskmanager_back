import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

import "dotenv/config";

const salesPool = mysql.createPool({
  host: process.env.SALES_DB_HOST || process.env.DB_HOST || "localhost",
  user: process.env.SALES_DB_USER || process.env.DB_USER!,
  password: process.env.SALES_DB_PASSWORD || process.env.DB_PASSWORD!,
  database: process.env.SALES_DB_NAME || "systigo_sales",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: ['DATE'],
});

export const salesDb = drizzle(salesPool, { schema, mode: "default" });

export { salesPool };
