import { db } from "../models/db";
import { attendance, holidayRequests, onlineRequests, holidays, permissions, settings, users, bonuses, deductions } from "../models/schema"; 
import { eq, and, gte, lte, asc, desc } from 'drizzle-orm';

export const calculateAttendanceReport = async (userId: string, fromDateStr: string, toDateStr: string, page: number = 1, limit: number = 10) => {
    const fromDate = new Date(fromDateStr);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(toDateStr);
    toDate.setHours(23, 59, 59, 999);

    // Fetch all related data in the date range
    const [attRecords, holReqs, onlReqs, permReqs, holSystem, sysSettingsData, userData] = await Promise.all([
        db.select().from(attendance)
            .where(and(eq(attendance.userId, userId), gte(attendance.from, fromDate), lte(attendance.from, toDate)))
            .orderBy(asc(attendance.from)),
        db.select().from(holidayRequests)
            .where(and(eq(holidayRequests.userId, userId), gte(holidayRequests.date, fromDate), lte(holidayRequests.date, toDate))),
        db.select().from(onlineRequests)
            .where(and(eq(onlineRequests.userId, userId), gte(onlineRequests.date, fromDate), lte(onlineRequests.date, toDate))),
        db.select().from(permissions)
            .where(and(eq(permissions.userId, userId), gte(permissions.date, fromDate), lte(permissions.date, toDate), eq(permissions.status, "approve"))),
        db.select().from(holidays).limit(1),
        db.select().from(settings).limit(1),
        db.select().from(users).where(eq(users.id, userId)).limit(1)
    ]);

    const sysHolidays = holSystem[0] || { type: 'fixed', days: [], workNum: 0, holidaysNum: 0 };
    const sysSettings = sysSettingsData[0] || {};
    const user = userData[0];

    const targetYear = fromDate.getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    
    // Fetch all approved holidays for the user in this year up to toDate
    const yearlyHolReqs = await db.select().from(holidayRequests)
        .where(
            and(
                eq(holidayRequests.userId, userId),
                eq(holidayRequests.status, "approve"),
                gte(holidayRequests.date, startOfYear),
                lte(holidayRequests.date, toDate)
            )
        );

    // Fetch bonuses and deductions for the filtered months/years
    // Extract unique months and years from the date range
    const monthsInFilter = new Set<number>();
    const yearsInFilter = new Set<number>();
    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        monthsInFilter.add(d.getMonth() + 1);
        yearsInFilter.add(d.getFullYear());
    }

    const [userBonuses, userDeductions] = await Promise.all([
        db.select().from(bonuses).where(eq(bonuses.userId, userId)),
        db.select().from(deductions).where(eq(deductions.userId, userId))
    ]);

    // Filter bonuses and deductions to match the filtered months and years
    const filteredBonuses = userBonuses.filter(b => monthsInFilter.has(b.month) && yearsInFilter.has(b.year));
    const filteredDeductions = userDeductions.filter(d => monthsInFilter.has(d.month) && yearsInFilter.has(d.year));
    
    // Convert to dictionaries for O(1) lookup by YYYY-MM-DD
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const dict = {
        att: {} as Record<string, typeof attRecords[0]>,
        holReq: {} as Record<string, typeof holReqs[0]>,
        onlReq: {} as Record<string, typeof onlReqs[0]>,
        permReq: {} as Record<string, number>
    };

    attRecords.forEach(r => dict.att[formatDate(new Date(r.from))] = r);
    holReqs.forEach(r => dict.holReq[formatDate(new Date(r.date))] = r);
    onlReqs.forEach(r => dict.onlReq[formatDate(new Date(r.date))] = r);
    permReqs.forEach(r => {
        const d = formatDate(new Date(r.date));
        dict.permReq[d] = (dict.permReq[d] || 0) + r.hours;
    });

    // Helper for continuous work logic for type='number'
    // This is a naive implementation that checks backward from DB
    let workStreak = 0;
    if (sysHolidays.type === 'number') {
        const allPastAtt = await db.select().from(attendance)
            .where(and(eq(attendance.userId, userId), lte(attendance.from, fromDate)))
            .orderBy(desc(attendance.from));
            
        // Calculate the streak before the 'from' date
        let currentDate = new Date(fromDate);
        currentDate.setDate(currentDate.getDate() - 1);
        for (const record of allPastAtt) {
            const dStr = formatDate(new Date(record.from));
            const cStr = formatDate(currentDate);
            if (dStr === cStr) {
                workStreak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break; // gap found
            }
        }
    }

    // Pre-calculate standard holidays for the entire year to properly count used yearly holidays
    const isDayStandardHoliday = (d: Date, currentStreak: number): { isStandard: boolean, nextStreak: number } => {
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
        let isStandardHoliday = false;
        let nextStreak = currentStreak + 1; // Default assumes attendance/work, though we only care about if it resets streak

        if (sysHolidays.type === 'fixed') {
            let daysArray = sysHolidays.days || [];
            if (typeof daysArray === 'string') {
                try { daysArray = JSON.parse(daysArray); } catch (e) { daysArray = []; }
            }
            if (Array.isArray(daysArray) && daysArray.includes(dayName.toLowerCase())) {
                isStandardHoliday = true;
            }
        } else if (sysHolidays.type === 'number') {
            // Simplified standard holiday calculation for 'number' type for yearly accumulation
            // In reality, this requires exact daily streak tracking which is complex.
            // For yearly accumulation, we mostly rely on 'fixed' type, but we approximate 'number' here.
            if (currentStreak >= (sysHolidays.workNum || 0)) {
                isStandardHoliday = true;
                nextStreak = 0;
            }
        }
        return { isStandard: isStandardHoliday, nextStreak };
    };

    // Calculate how many yearly holidays have been consumed UP TO the start of the filter date
    // And keep a running counter.
    let yearlyHolidaysUsed = 0;
    let yearlyHolidaysTotalAllowed = sysSettings.yearly_holidays || 0;
    const isYearlyHolidaysActive = user?.yearly_holidays || false;

    // Prorate holidays if user joined in the target year
    if (user?.createdAt) {
        const joinYear = user.createdAt.getFullYear();
        if (joinYear === targetYear) {
            const joinMonth = user.createdAt.getMonth(); // 0-indexed, July is 6
            const monthsWorked = 12 - joinMonth; // 12 - 6 = 6 months
            yearlyHolidaysTotalAllowed = Math.round(yearlyHolidaysTotalAllowed * (monthsWorked / 12));
        } else if (joinYear > targetYear) {
            // If checking a year before they joined
            yearlyHolidaysTotalAllowed = 0;
        }
    }

    if (isYearlyHolidaysActive) {
        // Iterate through all approved holiday requests in the year and count them,
        // IGNORING those that fall on standard holidays.
        for (const req of yearlyHolReqs) {
            const reqDate = new Date(req.date);
            const { isStandard } = isDayStandardHoliday(reqDate, 0); // Simplified streak for past days
            if (!isStandard) {
                yearlyHolidaysUsed++;
            }
        }
    }
    
    // Find first attendance date for this user
    const firstAttData = await db.select().from(attendance)
        .where(eq(attendance.userId, userId))
        .orderBy(asc(attendance.from)).limit(1);
    const firstAttendanceDate = firstAttData.length > 0 ? new Date(firstAttData[0].from) : null;
    if (firstAttendanceDate) {
        firstAttendanceDate.setHours(0, 0, 0, 0);
    }

    const fullReport = [];
    const summary = {
        totalDelay: 0,
        totalPermissionHours: 0,
        onsiteDays: 0,
        onlineWithRequest: 0,
        onlineWithoutRequest: 0,
        onlineRejected: 0,
        holidayApproved: 0,
        holidayRejected: 0,
        holidayStandard: 0,
        unexcusedAbsence: 0,
        daysBeforeJoining: 0,
        totalWorkingDaysInMonth: 0 // count of days in month - standard holidays
    };
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dStr = formatDate(d);
        const dayName = daysOfWeek[d.getDay()];
        
        const att = dict.att[dStr];
        const hReq = dict.holReq[dStr];
        const oReq = dict.onlReq[dStr];
        const pHours = dict.permReq[dStr] || 0;

        let status = '';
        let color = ''; // green, red, gray, orange, or empty
        
        const { isStandard: isStandardHoliday, nextStreak } = isDayStandardHoliday(d, workStreak);
        
        if (!isStandardHoliday) {
            summary.totalWorkingDaysInMonth++;
        }

        if (firstAttendanceDate === null || d < firstAttendanceDate) {
            status = 'Before Joining';
            color = 'bg-gray-100 border-gray-300 text-gray-500';
            summary.daysBeforeJoining++;
            
            fullReport.push({
                date: dStr,
                day: dayName,
                status,
                color,
                attendance: null
            });
            continue;
        }

        const isOnlineAllowedDay = (sysSettings as any).online_days?.includes(dayName.toLowerCase());

        if (att) {
            // User attended
            status = 'Present';
            workStreak++;
            summary.totalDelay += att.delay || 0;
            summary.totalPermissionHours += pHours;

            if (att.onsite) {
                summary.onsiteDays++;
            } else {
                if (att.isRequestOnline || isOnlineAllowedDay) {
                    summary.onlineWithRequest++;
                    if (!att.isRequestOnline) {
                        status = 'Present (Online Default)';
                    }
                } else {
                    if (oReq && oReq.status === 'reject') {
                        summary.onlineRejected = (summary.onlineRejected || 0) + 1;
                        status = 'Present (Online Rejected)';
                        color = 'bg-rose-100 border-rose-500'; 
                    } else {
                        summary.onlineWithoutRequest++;
                        status = 'Present (Online No Request)';
                        color = 'bg-amber-100 border-amber-400'; 
                    }
                }
            }
        } else {
            // User absent
            if (hReq) {
                if (hReq.status === 'approve') {
                    if (isStandardHoliday) {
                        status = 'Holiday (Standard)';
                        color = 'bg-slate-100 border-slate-300';
                        summary.holidayStandard++;
                    } else if (isYearlyHolidaysActive) {
                        status = 'Holiday (Approved)';
                        color = 'bg-emerald-100 border-emerald-400';
                        summary.holidayApproved++;
                    } else {
                        status = 'Holiday (Approved)';
                        color = 'bg-emerald-100 border-emerald-400';
                        summary.holidayApproved++;
                    }
                } else if (hReq.status === 'reject') {
                    status = 'Absent (Holiday Rejected)';
                    color = 'bg-rose-100 border-rose-500 text-rose-900'; 
                    summary.holidayRejected++;
                    workStreak = 0;
                } else {
                    status = 'Absent (Holiday Pending)';
                    color = 'bg-amber-100 border-amber-400 text-amber-900';
                    summary.unexcusedAbsence++;
                    workStreak = 0;
                }
            } else {
                if (isStandardHoliday) {
                    status = 'Holiday (Standard)';
                    color = 'bg-slate-100 border-slate-300';
                    summary.holidayStandard++;
                    workStreak = nextStreak;
                } else {
                    status = 'Unexcused Absence';
                    color = 'bg-orange-100 border-orange-500 text-orange-900'; 
                    summary.unexcusedAbsence++;
                    workStreak = 0; 
                }
            }
        }

        fullReport.push({
            date: dStr,
            day: dayName,
            status,
            color,
            attendance: att ? {
                from: att.from,
                to: att.to,
                hours: att.hours,
                delay: att.delay,
                permissionHours: pHours
            } : null
        });
    }

    const total = fullReport.length;
    const offset = (page - 1) * limit;
    const report = fullReport.slice(offset, offset + limit);

    return { 
        report, 
        summary,
        yearlyHolidaysSummary: {
            isActive: isYearlyHolidaysActive,
            totalAllowed: yearlyHolidaysTotalAllowed,
            used: yearlyHolidaysUsed,
            remaining: Math.max(0, yearlyHolidaysTotalAllowed - yearlyHolidaysUsed),
            exceeded: Math.max(0, yearlyHolidaysUsed - yearlyHolidaysTotalAllowed)
        },
        financials: {
            bonuses: filteredBonuses,
            deductions: filteredDeductions
        },
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
};
