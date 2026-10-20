"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
// src/models/sales/superadmin/users.ts
// Re-export canonical unified users table from Parent (Taskito)
var users_1 = require("../../superadmin/users");
Object.defineProperty(exports, "users", { enumerable: true, get: function () { return users_1.users; } });
