// src/services/attendanceActionService.ts

import { db } from "../models/db";
import {
  attendance,
  onlineRequests,
  settings,
  permissions,
  users,
  zones,
  shifts,
  extraTimeRequests,
} from "../models/schema";
import { eq, desc, and, isNull, gte, lte } from "drizzle-orm";

export function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let isInside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const x_i = polygon[i][0],
      y_i = polygon[i][1];
    const x_j = polygon[j][0],
      y_j = polygon[j][1];

    const intersect =
      y_i > lng !== y_j > lng &&
      lat < ((x_j - x_i) * (lng - y_i)) / (y_j - y_i) + x_i;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

export function parseTimeToSeconds(timeVal: string | null | undefined): number | null {
  if (!timeVal || typeof timeVal !== "string") return null;
  const parts = timeVal.trim().split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  const hours = parts[0];
  const minutes = parts[1];
  const seconds = parts.length > 2 && !isNaN(parts[2]) ? parts[2] : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export function normalizeMac(mac?: string | null): string {
  if (!mac || typeof mac !== "string") return "";
  return mac.toLowerCase().replace(/[:-]/g, "").trim();
}

export const getOpenAttendanceRecord = async (userId: string) => {
  const openRecords = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), isNull(attendance.to)))
    .orderBy(desc(attendance.from))
    .limit(1);

  return openRecords[0] || null;
};

export interface AttendanceActionParams {
  userId: string;
  lat?: number;
  lng?: number;
  clientIp?: string;
  macAddress?: string;
}

export interface AttendanceActionResult {
  success: boolean;
  statusCode: number;
  message: string;
  action: "checkin" | "checkout";
  onsite?: boolean;
  departureOnsite?: boolean;
  isRequestOnline?: boolean;
  hours?: number;
  delay?: number;
  record?: any;
}

// 📌 Core Check-In Logic
export const executeCheckInLogic = async (
  params: AttendanceActionParams
): Promise<AttendanceActionResult> => {
  const { userId, lat, lng, clientIp, macAddress } = params;

  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (currentUser.length === 0) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found",
      action: "checkin",
    };
  }

  const sysSettings = await db.select().from(settings).limit(1);
  const systemSettings = sysSettings[0] || {};

  // 🔒 Router IP / Network validation based on user's assigned zone
  const zoneId = currentUser[0]?.zone_id;
  let userZone: any = null;
  if (zoneId) {
    const [z] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
    userZone = z || null;
  }

  const isIpVerificationActive = Boolean(userZone?.router_ip_status ?? userZone?.router_mac_status);
  const expectedRouterIp = (userZone?.router_ip || userZone?.router_mac || "").trim();

  if (isIpVerificationActive && expectedRouterIp) {
    let userIp = clientIp || "";
    if (userIp === "::1" || userIp === "::ffff:127.0.0.1") userIp = "127.0.0.1";
    if (userIp.startsWith("::ffff:")) userIp = userIp.replace("::ffff:", "");

    const clientMacNorm = normalizeMac(macAddress);
    const expectedNorm = normalizeMac(expectedRouterIp);

    const isIpMatch = userIp && (userIp === expectedRouterIp || expectedRouterIp.includes(userIp));
    const isMacMatch = Boolean(clientMacNorm && expectedNorm && clientMacNorm === expectedNorm);

    if (!isIpMatch && !isMacMatch) {
      return {
        success: false,
        statusCode: 403,
        message: `Invalid Router IP (${userIp || "unknown"}). You must be connected to your assigned zone's router network (${expectedRouterIp}).`,
        action: "checkin",
      };
    }
  }

  // 🔒 Early Check-In restriction: settings.early_max
  const earlyMaxSeconds = parseTimeToSeconds(systemSettings?.early_max);
  if (earlyMaxSeconds !== null) {
    const now = new Date();
    const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    if (currentSeconds < earlyMaxSeconds) {
      // Must have an approved extraTimeRequest for today with early_attend = true
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const approvedEarly = await db
        .select()
        .from(extraTimeRequests)
        .where(
          and(
            eq(extraTimeRequests.userId, userId),
            eq(extraTimeRequests.status, "approve"),
            eq(extraTimeRequests.early_attend, true),
            gte(extraTimeRequests.date, todayStart),
            lte(extraTimeRequests.date, todayEnd)
          )
        )
        .limit(1);

      if (approvedEarly.length === 0) {
        return {
          success: false,
          statusCode: 403,
          message: `Cannot check in before ${systemSettings.early_max} without an approved early attendance request.`,
          action: "checkin",
        };
      }
    }
  }

  // Zone Polygon check
  let locations: any[] = [];
  if (userZone) {
    locations = (userZone.locations as any) || [];
    if (typeof locations === "string") {
      try {
        locations = JSON.parse(locations);
      } catch (e) {
        locations = [];
      }
    }
  }

  let onsite = false;
  if (
    lat !== undefined &&
    lng !== undefined &&
    Array.isArray(locations) &&
    locations.length >= 3
  ) {
    if (isPointInPolygon(lat, lng, locations)) {
      onsite = true;
    }
  }

  // Online Days calculation
  let userOnlineDays = (currentUser[0]?.online_days as any) || [];
  if (typeof userOnlineDays === "string") {
    try {
      userOnlineDays = JSON.parse(userOnlineDays);
    } catch (e) {
      userOnlineDays = [];
    }
  }
  let onlineDays =
    Array.isArray(userOnlineDays) && userOnlineDays.length > 0
      ? userOnlineDays
      : (systemSettings?.online_days as any) || [];
  if (typeof onlineDays === "string") {
    try {
      onlineDays = JSON.parse(onlineDays);
    } catch (e) {
      onlineDays = [];
    }
  }

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDayName = daysOfWeek[new Date().getDay()];
  const isOnlineDay =
    Array.isArray(onlineDays) &&
    onlineDays
      .map((d: string) => String(d).toLowerCase())
      .includes(currentDayName.toLowerCase());

  let isRequestOnline = false;
  if (isOnlineDay) {
    isRequestOnline = true;
    onsite = false;
  } else if (!onsite) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const requests = await db
      .select()
      .from(onlineRequests)
      .where(
        and(
          eq(onlineRequests.userId, userId),
          eq(onlineRequests.status, "approve"),
          gte(onlineRequests.date, todayStart),
          lte(onlineRequests.date, todayEnd)
        )
      );

    if (requests.length > 0) {
      isRequestOnline = true;
    }
  }

  await db.insert(attendance).values({
    userId,
    from: new Date(),
    onsite,
    isRequestOnline,
  });

  return {
    success: true,
    statusCode: 201,
    message: "Checked in successfully",
    action: "checkin",
    onsite,
    isRequestOnline,
  };
};

// 📌 Core Check-Out Logic
export const executeCheckOutLogic = async (
  params: AttendanceActionParams
): Promise<AttendanceActionResult> => {
  const { userId, lat, lng, clientIp, macAddress } = params;

  const openRecords = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.userId, userId), isNull(attendance.to)))
    .orderBy(desc(attendance.from))
    .limit(1);

  if (openRecords.length === 0) {
    return {
      success: false,
      statusCode: 400,
      message: "No active check-in found.",
      action: "checkout",
    };
  }

  const record = openRecords[0];
  const toDate = new Date();

  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (currentUser.length === 0) {
    return {
      success: false,
      statusCode: 404,
      message: "User not found",
      action: "checkout",
    };
  }

  const sysSettings = await db.select().from(settings).limit(1);
  const systemSettings = sysSettings[0] || {};

  // 🔒 Router IP / Network validation based on user's assigned zone
  const zoneId = currentUser[0]?.zone_id;
  let userZone: any = null;
  if (zoneId) {
    const [z] = await db.select().from(zones).where(eq(zones.id, zoneId)).limit(1);
    userZone = z || null;
  }

  const isIpVerificationActive = Boolean(userZone?.router_ip_status ?? userZone?.router_mac_status);
  const expectedRouterIp = (userZone?.router_ip || userZone?.router_mac || "").trim();

  if (isIpVerificationActive && expectedRouterIp) {
    let userIp = clientIp || "";
    if (userIp === "::1" || userIp === "::ffff:127.0.0.1") userIp = "127.0.0.1";
    if (userIp.startsWith("::ffff:")) userIp = userIp.replace("::ffff:", "");

    const clientMacNorm = normalizeMac(macAddress);
    const expectedNorm = normalizeMac(expectedRouterIp);

    const isIpMatch = userIp && (userIp === expectedRouterIp || expectedRouterIp.includes(userIp));
    const isMacMatch = Boolean(clientMacNorm && expectedNorm && clientMacNorm === expectedNorm);

    if (!isIpMatch && !isMacMatch) {
      return {
        success: false,
        statusCode: 403,
        message: `Invalid Router IP (${userIp || "unknown"}). You must be connected to your assigned zone's router network (${expectedRouterIp}).`,
        action: "checkout",
      };
    }
  }

  // 🔒 Late Check-Out restriction: settings.late_max
  const lateMaxSeconds = parseTimeToSeconds(systemSettings?.late_max);
  if (lateMaxSeconds !== null) {
    const currentSeconds = toDate.getHours() * 3600 + toDate.getMinutes() * 60 + toDate.getSeconds();
    if (currentSeconds > lateMaxSeconds) {
      // Must have an approved extraTimeRequest for today with late_leave = true
      const todayStart = new Date(toDate);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(toDate);
      todayEnd.setHours(23, 59, 59, 999);

      const approvedLate = await db
        .select()
        .from(extraTimeRequests)
        .where(
          and(
            eq(extraTimeRequests.userId, userId),
            eq(extraTimeRequests.status, "approve"),
            eq(extraTimeRequests.late_leave, true),
            gte(extraTimeRequests.date, todayStart),
            lte(extraTimeRequests.date, todayEnd)
          )
        )
        .limit(1);

      if (approvedLate.length === 0) {
        return {
          success: false,
          statusCode: 403,
          message: `Cannot check out after ${systemSettings.late_max} without an approved late leave request.`,
          action: "checkout",
        };
      }
    }
  }

  const shiftId = currentUser[0]?.shift_id;

  let locations: any[] = [];
  if (userZone) {
    locations = (userZone.locations as any) || [];
    if (typeof locations === "string") {
      try {
        locations = JSON.parse(locations);
      } catch (e) {
        locations = [];
      }
    }
  }

  let departureOnsite = false;
  if (
    lat !== undefined &&
    lng !== undefined &&
    Array.isArray(locations) &&
    locations.length >= 3
  ) {
    if (isPointInPolygon(lat, lng, locations)) {
      departureOnsite = true;
    }
  }

  const recordFromDate = new Date(record.from);
  const diffMs = toDate.getTime() - recordFromDate.getTime();
  const workedHours = diffMs / (1000 * 60 * 60);

  let delay = 0;
  let earlyLeave = 0;
  const delayPermissionMinutes = systemSettings?.delay_premission_minutes || 0;

  let userShift = null;
  if (shiftId) {
    const fetchedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    userShift = fetchedShift[0];
  }

  if (userShift && userShift.days) {
    let daysData: any = userShift.days;
    if (typeof daysData === "string") {
      try {
        daysData = JSON.parse(daysData);
      } catch (e) {
        daysData = {};
      }
    }

    const daysOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const currentDayStr = daysOfWeek[recordFromDate.getDay()];
    const todayShift = daysData[currentDayStr];

    if (todayShift && todayShift.active && todayShift.from && todayShift.to) {
      const [shiftFromH, shiftFromM] = todayShift.from.split(":").map(Number);
      const [shiftToH, shiftToM] = todayShift.to.split(":").map(Number);

      const expectedStart = new Date(recordFromDate);
      expectedStart.setHours(shiftFromH, shiftFromM, 0, 0);

      let expectedEnd = new Date(recordFromDate);
      expectedEnd.setHours(shiftToH, shiftToM, 0, 0);

      if (expectedEnd.getTime() < expectedStart.getTime()) {
        expectedEnd.setDate(expectedEnd.getDate() + 1);
      }

      const requiredHours =
        (expectedEnd.getTime() - expectedStart.getTime()) / (1000 * 60 * 60);

      if (record.isRequestOnline || !record.onsite) {
        // Online mode: flexible hours, delay is shortage of total hours
        if (workedHours < requiredHours) {
          delay = requiredHours - workedHours;
        }
      } else {
        const lateMs = recordFromDate.getTime() - expectedStart.getTime();
        if (lateMs > 0) {
          const lateMinutes = lateMs / (1000 * 60);
          if (lateMinutes > delayPermissionMinutes) {
            delay += lateMs / (1000 * 60 * 60);
          }
        }

        const earlyMs = expectedEnd.getTime() - toDate.getTime();
        if (earlyMs > 0) {
          earlyLeave = earlyMs / (1000 * 60 * 60);
        }
      }
    }
  }

  const todayStart = new Date(recordFromDate);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(recordFromDate);
  todayEnd.setHours(23, 59, 59, 999);

  const permRecords = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.userId, userId),
        eq(permissions.status, "approve"),
        gte(permissions.date, todayStart),
        lte(permissions.date, todayEnd)
      )
    );

  let totalPenalty = delay + earlyLeave;
  let permissionHoursCovered = 0;

  for (const p of permRecords) {
    permissionHoursCovered += p.hours;
  }

  if (totalPenalty > 0 && permissionHoursCovered > 0) {
    if (permissionHoursCovered >= totalPenalty) {
      totalPenalty = 0;
    } else {
      totalPenalty -= permissionHoursCovered;
    }
  }

  await db
    .update(attendance)
    .set({
      to: toDate,
      departureOnsite,
      hours: workedHours,
      delay: totalPenalty,
    })
    .where(eq(attendance.id, record.id));

  return {
    success: true,
    statusCode: 200,
    message: "Checked out successfully",
    action: "checkout",
    hours: workedHours,
    delay: totalPenalty,
    departureOnsite,
  };
};
