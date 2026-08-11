"use strict";
// src/utils/tokenBlacklist.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBlacklisted = exports.addToBlacklist = void 0;
const blacklistedTokens = new Set();
const addToBlacklist = (token) => {
    blacklistedTokens.add(token);
};
exports.addToBlacklist = addToBlacklist;
const isBlacklisted = (token) => {
    return blacklistedTokens.has(token);
};
exports.isBlacklisted = isBlacklisted;
