import { db } from "../../models/db";
import { users, attendance, holidayRequests, onlineRequests, permissions, holidays } from "../../models/schema";
import { Seed } from "../runner";
import { eq } from "drizzle-orm";

export const hrmDataSeed: Seed = {
    name: "02_hrm_data",
    run: async () => {
        // Ensure we have some users to associate records with
        const allUsers = await db.select().from(users).limit(2);
        if (allUsers.length === 0) {
            console.log("No users found. Skipping HRM data seed.");
            return;
        }

        const user1 = allUsers[0].id;
        const user2 = allUsers.length > 1 ? allUsers[1].id : allUsers[0].id;

        // 1. Seed Holidays System (Fixed: Friday, Saturday)
        const existingHolidays = await db.select().from(holidays);
        if (existingHolidays.length === 0) {
            await db.insert(holidays).values({
                type: "fixed",
                days: ["Friday", "Saturday"],
                workNum: 0,
                holidaysNum: 0
            });
        } else {
            await db.update(holidays).set({
                type: "fixed",
                days: ["Friday", "Saturday"]
            }).where(eq(holidays.id, existingHolidays[0].id));
        }

        const today = new Date();
        const dates = Array.from({ length: 14 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - (13 - i)); // Past 14 days
            return d;
        });

        // 2. Seed Attendance (Comprehensive Cases)
        const attendanceData: any[] = [];
        
        // Let's build 14 days of history for user1
        // Day 0: Normal On-site
        attendanceData.push({ userId: user1, from: new Date(dates[0].setHours(9, 0, 0)), to: new Date(dates[0].setHours(17, 0, 0)), onsite: true, isRequestOnline: false, hours: 8, delay: 0 });
        
        // Day 1: Late On-site (Penalty)
        attendanceData.push({ userId: user1, from: new Date(dates[1].setHours(10, 30, 0)), to: new Date(dates[1].setHours(17, 0, 0)), onsite: true, isRequestOnline: false, hours: 6.5, delay: 1.5 });
        
        // Day 2: Approved Online Request 
        // -> attendance needs to match online req
        attendanceData.push({ userId: user1, from: new Date(dates[2].setHours(9, 0, 0)), to: new Date(dates[2].setHours(17, 0, 0)), onsite: false, isRequestOnline: true, hours: 8, delay: 0 });
        
        // Day 3: Approved Holiday
        // -> No attendance record needed
        
        // Day 4: Rejected Holiday (And they didn't show up -> Unexcused)
        // -> No attendance record needed
        
        // Day 5 & 6: Weekend (Friday & Saturday) -> Standard Holiday (Gray)
        // -> No attendance record needed
        
        // Day 7: Normal On-site
        attendanceData.push({ userId: user1, from: new Date(dates[7].setHours(8, 55, 0)), to: new Date(dates[7].setHours(17, 5, 0)), onsite: true, isRequestOnline: false, hours: 8.16, delay: 0 });

        // Day 8: Had a 3-hour Permission (Left early)
        attendanceData.push({ userId: user1, from: new Date(dates[8].setHours(9, 0, 0)), to: new Date(dates[8].setHours(14, 0, 0)), onsite: true, isRequestOnline: false, hours: 5, delay: 0 }); // Delay logic handled dynamically via permission deduction
        
        // Day 9: Unexcused Absence
        // -> No attendance record needed

        // Day 10: Online Request Pending
        // -> They worked from home anyway
        attendanceData.push({ userId: user1, from: new Date(dates[10].setHours(9, 0, 0)), to: new Date(dates[10].setHours(17, 0, 0)), onsite: false, isRequestOnline: false, hours: 8, delay: 0 });

        // Day 11, 12: Normal
        attendanceData.push({ userId: user1, from: new Date(dates[11].setHours(9, 0, 0)), to: new Date(dates[11].setHours(17, 0, 0)), onsite: true, isRequestOnline: false, hours: 8, delay: 0 });
        attendanceData.push({ userId: user1, from: new Date(dates[12].setHours(9, 0, 0)), to: new Date(dates[12].setHours(17, 0, 0)), onsite: true, isRequestOnline: false, hours: 8, delay: 0 });

        // Day 13 (Today): Active check-in (Missing to)
        attendanceData.push({ userId: user1, from: new Date(dates[13].setHours(9, 10, 0)), to: null, onsite: true, isRequestOnline: false, hours: 0, delay: 0 });

        await db.insert(attendance).values(attendanceData);

        // 3. Seed Holiday Requests
        await db.insert(holidayRequests).values([
            // Day 3: Approved
            { userId: user1, date: new Date(dates[3].setHours(0, 0, 0)), status: "approve" },
            // Day 4: Rejected
            { userId: user1, date: new Date(dates[4].setHours(0, 0, 0)), status: "reject" },
            // Future Day: Pending
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), status: "pending" },
        ]);

        // 4. Seed Online Requests
        await db.insert(onlineRequests).values([
            // Day 2: Approved
            { userId: user1, date: new Date(dates[2].setHours(0, 0, 0)), status: "approve" },
            // Day 10: Pending
            { userId: user1, date: new Date(dates[10].setHours(0, 0, 0)), status: "pending" },
        ]);

        // 5. Seed Permissions
        await db.insert(permissions).values([
            // Day 8: Approved 3 hours
            { userId: user1, date: new Date(dates[8].setHours(0, 0, 0)), hours: 3, reason: "Doctor appointment", status: "approve" },
            // Day 11: Rejected 1 hour
            { userId: user1, date: new Date(dates[11].setHours(0, 0, 0)), hours: 1, reason: "Personal emergency", status: "reject" },
            // Future Day: Pending
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), hours: 2, reason: "Family event", status: "pending" },
        ]);
    },
    rollback: async () => {
        await db.delete(attendance);
        await db.delete(holidayRequests);
        await db.delete(onlineRequests);
        await db.delete(permissions);
        await db.delete(holidays);
    }
};
