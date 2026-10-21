"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.salesPool = exports.salesDb = void 0;
// src/models/sales/db.ts
// Unified with primary database (Taskito)
const db_1 = require("../db");
exports.salesDb = db_1.db;
exports.salesPool = db_1.pool;
