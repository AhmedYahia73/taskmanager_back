import { db } from "./src/models/db";
import { users, attendance, holidayRequests, onlineRequests, permissions, holidays } from "./src/models/schema";

async function seed() {
    try {
        console.log("Starting seeding process...");

        // Ensure we have some users to associate records with
        const allUsers = await db.select().from(users).limit(2);
        if (allUsers.length === 0) {
            console.log("No users found. Please create at least one user before seeding HRM data.");
            process.exit(1);
        }

        const user1 = allUsers[0].id;
        const user2 = allUsers.length > 1 ? allUsers[1].id : allUsers[0].id;

        // 1. Seed Holidays System
        await db.insert(holidays).values({
            type: "number",
            days: [],
            workNum: 5,
            holidaysNum: 2
        });
        console.log("Seeded holidays system settings.");

        // 2. Seed Attendance (Different cases)
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        await db.insert(attendance).values([
            // Case 1: On-site attendance (Completed)
            { userId: user1, from: new Date(yesterday.setHours(9, 0, 0)), to: new Date(yesterday.setHours(17, 0, 0)), onsite: true, isRequestOnline: false, hours: 8, delay: 0 },
            // Case 2: Online Request attendance (Completed with some delay)
            { userId: user2, from: new Date(today.setHours(9, 30, 0)), to: new Date(today.setHours(17, 30, 0)), onsite: false, isRequestOnline: true, hours: 8, delay: 0.5 },
            // Case 3: Currently active check-in (Missing to)
            { userId: user1, from: new Date(), to: null, onsite: true, isRequestOnline: false, hours: 0, delay: 0 }
        ]);
        console.log("Seeded attendance records.");

        // 3. Seed Holiday Requests
        await db.insert(holidayRequests).values([
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), status: "pending" },
            { userId: user2, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5), status: "approve" },
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 10), status: "reject" },
        ]);
        console.log("Seeded holiday requests.");

        // 4. Seed Online Requests
        await db.insert(onlineRequests).values([
            { userId: user2, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3), status: "pending" },
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), status: "approve" },
        ]);
        console.log("Seeded online requests.");

        // 5. Seed Permissions
        await db.insert(permissions).values([
            { userId: user1, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), hours: 2, reason: "Doctor appointment", status: "pending" },
            { userId: user2, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), hours: 3, reason: "Personal emergency", status: "approve" },
        ]);
        console.log("Seeded permissions.");

        console.log("Seeding completed successfully! 🎉");
        process.exit(0);
    } catch (error) {
        console.error("Error during seeding:", error);
        process.exit(1);
    }
}

seed();
