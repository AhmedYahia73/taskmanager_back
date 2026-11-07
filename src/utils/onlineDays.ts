// src/utils/onlineDays.ts

/**
 * Safely normalizes online days from database or request payloads.
 * Handles deeply nested JSON stringification (e.g. "\"\\\"[\\\"saturday\\\"]\\\"\"")
 * and returns a clean, unique array of lowercase day names.
 */
export const normalizeOnlineDays = (val: any): string[] => {
  let current = val;
  while (typeof current === "string") {
    try {
      const parsed = JSON.parse(current);
      if (parsed === current) break;
      current = parsed;
    } catch {
      break;
    }
  }

  if (Array.isArray(current)) {
    return Array.from(
      new Set(
        current
          .filter((d): d is string => typeof d === "string")
          .map((d) => d.trim().toLowerCase())
      )
    );
  }

  return [];
};

/**
 * Checks if a given day name (e.g. "Saturday" or "saturday") is in the user's or system's online days.
 */
export const isOnlineDayAllowed = (
  dayName: string,
  userOnlineDays: any,
  systemOnlineDays: any
): boolean => {
  const uDays = normalizeOnlineDays(userOnlineDays);
  const sysDays = normalizeOnlineDays(systemOnlineDays);
  const effective = uDays.length > 0 ? uDays : sysDays;
  return effective.includes(dayName.trim().toLowerCase());
};
