// src/models/sales/db.ts
// Unified with primary database (Taskito)
import { db, pool } from "../db";

export const salesDb = db;
export const salesPool = pool;
