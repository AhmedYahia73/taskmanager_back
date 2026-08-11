import { Request, Response } from "express";
import { db } from "../../models/db";
import { 
  users, 
  attendance, 
  holidayRequests, 
  onlineRequests, 
  permissions, 
  shifts, 
  departments, 
  settings, 
  holidays 
} from "../../models/schema"; 
import { SQL, and, or, eq, like, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";

export const getEmployeeLive = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const offset = (page - 1) * limit;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const startOfDay = new Date(todayStr + 'T00:00:00');
        const endOfDay = new Date(todayStr + 'T23:59:59');

        let whereConditions: SQL[] = [
            or(eq(users.role, "tester"), eq(users.role, "engineer")) as SQL
        ];

        if (search) {
            const searchPattern = `%${search}%`;
            whereConditions.push(
                or(
                    like(users.name, searchPattern),
                    like(users.phone, searchPattern),
                    like(users.email, searchPattern)
                ) as SQL
            );
        }

        const validRolesCondition = and(...whereConditions);

        // Fetch users with task progress logic (similar to getAllUser)
        const allUsers = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                image: users.image,
                role: users.role,
                status: users.status,
                department_id: users.department_id,
                inprogress_count: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'inprogress'), 0)`.as('inprogress_count'),
                progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('progress'),
                done_progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('done_progress'),
            })
            .from(users)
            .where(validRolesCondition)
            .limit(limit)
            .offset(offset);

        // For pagination total count
        const totalCountRes = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(validRolesCondition);
        const totalCount = totalCountRes[0].count;

        // Fetch related data for these users for today
        const userIds = allUsers.map(u => u.id);

        let liveUsers: any[] = [];

        if (userIds.length > 0) {
            const [
                attRecords,
                holReqs,
                onlReqs,
                permReqs,
                allShifts,
                sysSettingsData,
                holSystem,
                allDepartments
            ] = await Promise.all([
                db.select().from(attendance).where(and(inArray(attendance.userId, userIds), gte(attendance.from, startOfDay), lte(attendance.from, endOfDay))),
                db.select().from(holidayRequests).where(and(inArray(holidayRequests.userId, userIds), gte(holidayRequests.date, startOfDay), lte(holidayRequests.date, endOfDay))),
                db.select().from(onlineRequests).where(and(inArray(onlineRequests.userId, userIds), gte(onlineRequests.date, startOfDay), lte(onlineRequests.date, endOfDay))),
                db.select().from(permissions).where(and(inArray(permissions.userId, userIds), gte(permissions.date, startOfDay), lte(permissions.date, endOfDay), eq(permissions.status, "approve"))),
                db.select().from(shifts),
                db.select().from(settings).limit(1),
                db.select().from(holidays).limit(1),
                db.select().from(departments)
            ]);

            const sysSettings = sysSettingsData[0] || {};
            const sysHolidays = holSystem[0] || { type: 'fixed', days: [] };

            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayName = daysOfWeek[now.getDay()];

            for (const user of allUsers) {
                const userAtt = attRecords.find(a => a.userId === user.id);
                const userHol = holReqs.find(h => h.userId === user.id);
                const userOnl = onlReqs.find(o => o.userId === user.id);
                const userPerms = permReqs.filter(p => p.userId === user.id);
                
                // Get user shift
                const userFullData = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
                const userShiftId = userFullData[0]?.shift_id;
                const shift = allShifts.find(s => s.id === userShiftId);
                const department = allDepartments.find(d => d.id === user.department_id);
                
                let shiftFrom = null;
                let shiftTo = null;

                if (shift && shift.days) {
                    const shiftDays = typeof shift.days === 'string' ? JSON.parse(shift.days) : shift.days;
                    const shiftDayConfig = shiftDays[dayName.toLowerCase()];
                    if (shiftDayConfig && shiftDayConfig.active) {
                        shiftFrom = shiftDayConfig.from; // e.g. "09:00"
                        shiftTo = shiftDayConfig.to;     // e.g. "17:00"
                    }
                }

                // Parse current time to compare with shift
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTotalMinutes = currentHour * 60 + currentMinute;

                let sFromMinutes = -1;
                let sToMinutes = -1;

                if (shiftFrom) {
                    const [h, m] = shiftFrom.split(':').map(Number);
                    sFromMinutes = h * 60 + m;
                }
                if (shiftTo) {
                    const [h, m] = shiftTo.split(':').map(Number);
                    sToMinutes = h * 60 + m;
                }

                let liveStatus = 'Unknown';
                let colorClass = 'bg-zinc-100 text-zinc-600'; // default

                // Check Standard Holiday First
                let isStandardHoliday = false;
                if (sysHolidays.type === 'fixed') {
                    let daysArray = sysHolidays.days || [];
                    if (typeof daysArray === 'string') {
                        try { daysArray = JSON.parse(daysArray); } catch (e) { daysArray = []; }
                    }
                    if (Array.isArray(daysArray) && daysArray.includes(dayName.toLowerCase())) {
                        isStandardHoliday = true;
                    }
                }

                if (userHol) {
                    if (userHol.status === 'approve') {
                        liveStatus = 'Leave (Approved)';
                        colorClass = 'bg-[#e0f3eb] text-[#006c49]';
                    } else if (userHol.status === 'reject') {
                        liveStatus = 'Leave (Rejected)';
                        colorClass = 'bg-[#fef2f2] text-[#ba1a1a]';
                    } else {
                        liveStatus = 'Leave (Pending)';
                        colorClass = 'bg-amber-100 text-amber-800';
                    }
                } else if (isStandardHoliday && !userAtt) {
                    liveStatus = 'Official Holiday';
                    colorClass = 'bg-slate-100 text-slate-800';
                } else if (userAtt) {
                    // Check if on permission right now
                    let onPerm = false;
                    // Note: Schema only tracks 'date' and 'hours', not the exact timeframe 'from'/'to'.
                    // So we cannot determine if they are currently on a permission break.
                    // We only know they have an approved permission for today.
                    if (userPerms.length > 0) {
                        onPerm = true;
                    }

                    if (userAtt.to) {
                        // Checked out
                        if (sToMinutes > -1 && currentTotalMinutes < sToMinutes) {
                            // Checked out before shift ended
                            if (userPerms.length > 0) {
                                liveStatus = 'Left Early (With Permission)';
                                colorClass = 'bg-blue-100 text-blue-800';
                            } else {
                                liveStatus = 'Left Early (No Permission)';
                                colorClass = 'bg-[#fef2f2] text-[#ba1a1a]';
                            }
                        } else {
                            liveStatus = 'Outside Working Hours (Completed)';
                            colorClass = 'bg-zinc-100 text-zinc-600';
                        }
                    } else {
                        // Checked in, not checked out
                        if (sToMinutes > -1 && currentTotalMinutes > sToMinutes) {
                            liveStatus = 'Outside Working Hours (Still checked in)';
                            colorClass = 'bg-orange-100 text-orange-800';
                        } else {
                            if (userAtt.onsite) {
                                liveStatus = 'Working Onsite';
                                colorClass = 'bg-[#e0f3eb] text-[#006c49]';
                            } else {
                                if (userAtt.isRequestOnline) {
                                    liveStatus = 'Online (Approved Request)';
                                    colorClass = 'bg-teal-100 text-teal-800';
                                } else {
                                    if (userOnl && userOnl.status === 'reject') {
                                        liveStatus = 'Online (Rejected Request)';
                                        colorClass = 'bg-[#fef2f2] text-[#ba1a1a]';
                                    } else {
                                        liveStatus = 'Online (No Request)';
                                        colorClass = 'bg-amber-100 text-amber-800';
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Not checked in, no holiday request
                    if (sFromMinutes === -1) {
                        liveStatus = 'Shift Day Off';
                        colorClass = 'bg-slate-50 text-slate-500';
                    } else if (currentTotalMinutes < sFromMinutes) {
                        liveStatus = 'Before Shift';
                        colorClass = 'bg-zinc-100 text-zinc-600';
                    } else if (currentTotalMinutes > sToMinutes) {
                        liveStatus = 'Outside Working Hours (Absent)';
                        colorClass = 'bg-zinc-200 text-zinc-700';
                    } else {
                        liveStatus = 'Absent (No Request)';
                        colorClass = 'bg-[#fef2f2] text-[#ba1a1a]';
                    }
                }

                liveUsers.push({
                    ...user,
                    department_name: department?.name || 'Unknown Department',
                    liveStatus,
                    colorClass,
                    checkIn: userAtt?.from || null,
                    checkOut: userAtt?.to || null,
                    shiftFrom,
                    shiftTo
                });
            }
        }

        SuccessResponse(res, {
            users: liveUsers,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        }, 200);

    } catch (error) {
        console.error("Error in getEmployeeLive:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
