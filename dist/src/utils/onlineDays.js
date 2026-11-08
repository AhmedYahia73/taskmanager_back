"use strict";
// src/utils/onlineDays.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOnlineDayAllowed = exports.normalizeOnlineDays = exports.VALID_DAYS = void 0;
exports.VALID_DAYS = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
];
/**
 * Safely normalizes online days from database or request payloads.
 * Handles deeply nested JSON stringification (e.g. "\"\\\"[\\\"saturday\\\"]\\\"\"")
 * and even severely corrupted escaping by falling back to day-keyword extraction.
 */
const normalizeOnlineDays = (val) => {
    if (!val)
        return [];
    let current = val;
    while (typeof current === "string") {
        try {
            const parsed = JSON.parse(current);
            if (parsed === current)
                break;
            current = parsed;
        }
        catch {
            break;
        }
    }
    if (Array.isArray(current)) {
        return Array.from(new Set(current
            .filter((d) => typeof d === "string")
            .map((d) => d.trim().toLowerCase())
            .filter((d) => exports.VALID_DAYS.includes(d))));
    }
    // Fallback: If current is still a string (due to broken/corrupted escaping from DB),
    // extract any valid day names mentioned inside the string!
    if (typeof current === "string") {
        const lower = current.toLowerCase();
        const foundDays = exports.VALID_DAYS.filter((day) => lower.includes(day));
        if (foundDays.length > 0) {
            return Array.from(new Set(foundDays));
        }
    }
    return [];
};
exports.normalizeOnlineDays = normalizeOnlineDays;
/**
 * Checks if a given day name (e.g. "Saturday" or "saturday") is in the user's or system's online days.
 */
const isOnlineDayAllowed = (dayName, userOnlineDays, systemOnlineDays) => {
    const target = dayName.trim().toLowerCase();
    const uDays = (0, exports.normalizeOnlineDays)(userOnlineDays);
    const sysDays = (0, exports.normalizeOnlineDays)(systemOnlineDays);
    return uDays.includes(target) || sysDays.includes(target);
};
exports.isOnlineDayAllowed = isOnlineDayAllowed;
