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

export function normalizeLocations(rawLocations: any): [number, number][] {
  if (!rawLocations) return [];
  let parsed = rawLocations;
  while (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      break;
    }
  }

  if (!Array.isArray(parsed)) return [];

  const points: [number, number][] = [];
  for (const item of parsed) {
    if (!item) continue;
    let latVal: any = null;
    let lngVal: any = null;

    if (Array.isArray(item) && item.length >= 2) {
      latVal = item[0];
      lngVal = item[1];
    } else if (typeof item === "object") {
      latVal = item.lat ?? item.latitude ?? item.y;
      lngVal = item.lng ?? item.longitude ?? item.x;
    }

    const numLat = Number(latVal);
    const numLng = Number(lngVal);

    if (!isNaN(numLat) && !isNaN(numLng)) {
      points.push([numLat, numLng]);
    }
  }

  return points;
}

function distToSegmentSquared(
  p: [number, number],
  v: [number, number],
  w: [number, number]
): number {
  const midLat = ((v[0] + w[0]) / 2) * (Math.PI / 180);
  const kx = 111320 * Math.cos(midLat);
  const ky = 110574;

  const px = p[1] * kx, py = p[0] * ky;
  const vx = v[1] * kx, vy = v[0] * ky;
  const wx = w[1] * kx, wy = w[0] * ky;

  const l2 = (wx - vx) * (wx - vx) + (wy - vy) * (wy - vy);
  if (l2 === 0) return (px - vx) * (px - vx) + (py - vy) * (py - vy);

  let t = ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = vx + t * (wx - vx);
  const projY = vy + t * (wy - vy);

  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

export function isPointNearPolygon(
  lat: number,
  lng: number,
  pts: [number, number][],
  maxMeters: number = 35
): boolean {
  const maxMetersSq = maxMeters * maxMeters;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    // Check standard [lat, lng]
    const dSq1 = distToSegmentSquared([lat, lng], pts[i], pts[j]);
    if (dSq1 <= maxMetersSq) return true;

    // Check inverted [lng, lat]
    const dSq2 = distToSegmentSquared([lat, lng], [pts[i][1], pts[i][0]], [pts[j][1], pts[j][0]]);
    if (dSq2 <= maxMetersSq) return true;
  }
  return false;
}

export function isPointInPolygon(
  rawLat: number | string,
  rawLng: number | string,
  polygon: any
): boolean {
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (isNaN(lat) || isNaN(lng)) return false;

  const pts = normalizeLocations(polygon);
  if (pts.length < 3) return false;

  // 1. Ray-Casting standard [lat, lng]
  let insideStandard = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const latI = pts[i][0], lngI = pts[i][1];
    const latJ = pts[j][0], lngJ = pts[j][1];

    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) insideStandard = !insideStandard;
  }
  if (insideStandard) return true;

  // 2. Ray-Casting inverted [lng, lat] (GeoJSON convention)
  let insideInverted = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const lngI = pts[i][0], latI = pts[i][1];
    const lngJ = pts[j][0], latJ = pts[j][1];

    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI;
    if (intersect) insideInverted = !insideInverted;
  }
  if (insideInverted) return true;

  // 3. Proximity Buffer Check (within 35 meters to account for indoor GPS drift)
  if (isPointNearPolygon(lat, lng, pts, 35)) {
    return true;
  }

  return false;
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
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // 1. Look for today's open record first
  let openRecords = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.userId, userId),
        isNull(attendance.to),
        gte(attendance.from, todayStart),
        lte(attendance.from, todayEnd)
      )
    )
    .orderBy(desc(attendance.from))
    .limit(1);

  // 2. Fallback: check if there is an active overnight shift within 16 hours
  if (openRecords.length === 0) {
    const overnightLimit = new Date(now.getTime() - 16 * 60 * 60 * 1000);
    const activeOvernight = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.userId, userId),
          isNull(attendance.to),
          gte(attendance.from, overnightLimit)
        )
      )
      .orderBy(desc(attendance.from))
      .limit(1);

    if (activeOvernight.length > 0) {
      openRecords = activeOvernight;
    }
  }

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

  // Prevent multiple active check-ins for the same day
  const existingOpen = await getOpenAttendanceRecord(userId);
  if (existingOpen) {
    return {
      success: false,
      statusCode: 400,
      message: "You are already checked in.",
      action: "checkin",
    };
  }

  const sysSettings = await db.select().from(settings).orderBy(desc(settings.createdAt)).limit(1);
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
  let locations: [number, number][] = [];
  if (userZone) {
    locations = normalizeLocations(userZone.locations);
  }

  let onsite = false;
  if (lat !== undefined && lng !== undefined) {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!isNaN(numLat) && !isNaN(numLng)) {
      if (locations.length >= 3 && isPointInPolygon(numLat, numLng, locations)) {
        onsite = true;
      } else if (!userZone || locations.length < 3) {
        // Fallback: Check if point is inside any active company zone
        const allActiveZones = await db.select().from(zones).where(eq(zones.status, true));
        for (const az of allActiveZones) {
          const azLocs = normalizeLocations(az.locations);
          if (azLocs.length >= 3 && isPointInPolygon(numLat, numLng, azLocs)) {
            onsite = true;
            break;
          }
        }
      }
    }
  }

  console.log(`[Attendance CheckIn] User: ${userId} | Lat: ${lat}, Lng: ${lng} | Zone: ${userZone?.name || 'none'} (${locations.length} pts) | Onsite: ${onsite}`);

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
  if (!onsite) {
    if (isOnlineDay) {
      isRequestOnline = true;
    } else {
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
  }

  const now = new Date();

  // 🕒 Calculate Delay at Check-In
  let shiftFromH = 9;
  let shiftFromM = 0;
  const shiftId = currentUser[0]?.shift_id;
  if (shiftId) {
    const fetchedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    if (fetchedShift.length > 0 && fetchedShift[0]?.days) {
      let daysData: any = fetchedShift[0].days;
      if (typeof daysData === "string") {
        try { daysData = JSON.parse(daysData); } catch (e) { daysData = {}; }
      }
      const todayShift = daysData[currentDayName.toLowerCase()];
      if (todayShift && todayShift.active && todayShift.from) {
        const [h, m] = todayShift.from.split(":").map(Number);
        shiftFromH = h;
        shiftFromM = m;
      }
    }
  }

  const checkInMinutes = now.getHours() * 60 + now.getMinutes();
  const shiftStartMinutes = shiftFromH * 60 + shiftFromM;
  const lateMinutes = Math.max(0, checkInMinutes - shiftStartMinutes);
  const delayPermissionMinutes = Number(systemSettings?.delay_premission_minutes || 0);

  let initialDelay = 0;
  if (lateMinutes > delayPermissionMinutes) {
    // Exceeded allowed delay permission minutes -> full delay calculated
    initialDelay = lateMinutes / 60;
  }

  // Deduct approved permissions for today if any
  const todayStartCheck = new Date(now);
  todayStartCheck.setHours(0, 0, 0, 0);
  const todayEndCheck = new Date(now);
  todayEndCheck.setHours(23, 59, 59, 999);

  const permRecordsCheck = await db
    .select()
    .from(permissions)
    .where(
      and(
        eq(permissions.userId, userId),
        eq(permissions.status, "approve"),
        gte(permissions.date, todayStartCheck),
        lte(permissions.date, todayEndCheck)
      )
    );

  let permissionHoursCoveredCheck = 0;
  for (const p of permRecordsCheck) {
    permissionHoursCoveredCheck += p.hours;
  }

  if (initialDelay > 0 && permissionHoursCoveredCheck > 0) {
    initialDelay = Math.max(0, initialDelay - permissionHoursCoveredCheck);
  }

  initialDelay = Number(initialDelay.toFixed(2));

  await db.insert(attendance).values({
    userId,
    from: now,
    onsite,
    isRequestOnline,
    delay: initialDelay,
  });

  return {
    success: true,
    statusCode: 201,
    message: "Checked in successfully",
    action: "checkin",
    onsite,
    isRequestOnline,
    delay: initialDelay,
  };
};

// 📌 Core Check-Out Logic
export const executeCheckOutLogic = async (
  params: AttendanceActionParams
): Promise<AttendanceActionResult> => {
  const { userId, lat, lng, clientIp, macAddress } = params;

  const record = await getOpenAttendanceRecord(userId);

  if (!record) {
    return {
      success: false,
      statusCode: 400,
      message: "No active check-in found for today.",
      action: "checkout",
    };
  }

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

  const sysSettings = await db.select().from(settings).orderBy(desc(settings.createdAt)).limit(1);
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

  let locations: [number, number][] = [];
  if (userZone) {
    locations = normalizeLocations(userZone.locations);
  }

  let departureOnsite = false;
  if (lat !== undefined && lng !== undefined) {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!isNaN(numLat) && !isNaN(numLng)) {
      if (locations.length >= 3 && isPointInPolygon(numLat, numLng, locations)) {
        departureOnsite = true;
      } else if (!userZone || locations.length < 3) {
        // Fallback: Check if point is inside any active company zone
        const allActiveZones = await db.select().from(zones).where(eq(zones.status, true));
        for (const az of allActiveZones) {
          const azLocs = normalizeLocations(az.locations);
          if (azLocs.length >= 3 && isPointInPolygon(numLat, numLng, azLocs)) {
            departureOnsite = true;
            break;
          }
        }
      }
    }
  }

  console.log(`[Attendance CheckOut] User: ${userId} | Lat: ${lat}, Lng: ${lng} | Zone: ${userZone?.name || 'none'} (${locations.length} pts) | DepartureOnsite: ${departureOnsite}`);

  const recordFromDate = new Date(record.from);
  const diffMs = toDate.getTime() - recordFromDate.getTime();
  const workedHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

  let delay = 0;
  let earlyLeave = 0;
  const delayPermissionMinutes = Number(systemSettings?.delay_premission_minutes || 0);

  let shiftFromH = 9;
  let shiftFromM = 0;
  let shiftToH = 17;
  let shiftToM = 0;

  let userShift = null;
  if (shiftId) {
    const fetchedShift = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId))
      .limit(1);
    userShift = fetchedShift[0];
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

  if (userShift && userShift.days) {
    let daysData: any = userShift.days;
    if (typeof daysData === "string") {
      try {
        daysData = JSON.parse(daysData);
      } catch (e) {
        daysData = {};
      }
    }
    const todayShift = daysData[currentDayStr];
    if (todayShift && todayShift.active && todayShift.from && todayShift.to) {
      const [fH, fM] = todayShift.from.split(":").map(Number);
      const [tH, tM] = todayShift.to.split(":").map(Number);
      shiftFromH = fH;
      shiftFromM = fM;
      shiftToH = tH;
      shiftToM = tM;
    }
  }

  // 1. Calculate late arrival (coming early does not count as late or negative)
  const checkInMinutes = recordFromDate.getHours() * 60 + recordFromDate.getMinutes();
  const shiftStartMinutes = shiftFromH * 60 + shiftFromM;
  const lateMinutes = Math.max(0, checkInMinutes - shiftStartMinutes);

  // 2. Calculate early departure (staying late does NOT compensate for late arrival)
  const checkOutMinutes = toDate.getHours() * 60 + toDate.getMinutes();
  let shiftEndMinutes = shiftToH * 60 + shiftToM;
  if (shiftEndMinutes < shiftStartMinutes) {
    shiftEndMinutes += 24 * 60;
  }
  let adjustedCheckOut = checkOutMinutes;
  if (shiftEndMinutes >= 24 * 60 && adjustedCheckOut < shiftStartMinutes) {
    adjustedCheckOut += 24 * 60;
  }
  const earlyMinutes = Math.max(0, shiftEndMinutes - adjustedCheckOut);

  // 3. Total lost minutes
  const totalLostMinutes = lateMinutes + earlyMinutes;

  // 4. Apply delay permission minutes
  if (totalLostMinutes > delayPermissionMinutes) {
    delay = totalLostMinutes / 60;
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

  let totalPenalty = delay;
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

  totalPenalty = Number(totalPenalty.toFixed(2));

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
