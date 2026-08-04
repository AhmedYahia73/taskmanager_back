import { db } from "../../models/db";
import { users } from "../../models/superadmin/users";
import { projects } from "../../models/superadmin/projects";
import { projectGroups } from "../../models/superadmin/projectGroups";
import { projectUsers } from "../../models/superadmin/projectUsers";
import { groupUsers } from "../../models/superadmin/groupUsers";
import { tasks } from "../../models/superadmin/tasks";
import { settings } from "../../models/superadmin/settings";
import { zones } from "../../models/superadmin/zones";
import { shifts } from "../../models/superadmin/shifts";
import { Seed } from "../runner";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";

export const initialDataSeed: Seed = {
    name: "01_initial_data",
    run: async () => {
        console.log("Seeding users...");
        const password = await bcrypt.hash("password123", 10);
        
        const superAdminId = uuidv4();
        const adminId = uuidv4();
        const testerId = uuidv4();
        const engineerId = uuidv4();

        console.log("Seeding zones and shifts...");
        const zoneId1 = uuidv4();
        const zoneId2 = uuidv4();
        
        await db.insert(zones).values([
            { id: zoneId1, name: "Main HQ", status: true },
            { id: zoneId2, name: "Branch Office", status: true }
        ]);

        const shiftId1 = uuidv4();
        const shiftId2 = uuidv4();
        const shiftId3 = uuidv4();

        const defaultDays1 = {
            sunday: { active: true, from: "09:00", to: "17:00" },
            monday: { active: true, from: "09:00", to: "17:00" },
            tuesday: { active: true, from: "09:00", to: "17:00" },
            wednesday: { active: true, from: "09:00", to: "17:00" },
            thursday: { active: true, from: "09:00", to: "17:00" },
            friday: { active: false, from: "09:00", to: "17:00" },
            saturday: { active: false, from: "09:00", to: "17:00" }
        };

        const defaultDays2 = {
            sunday: { active: true, from: "17:00", to: "01:00" },
            monday: { active: true, from: "17:00", to: "01:00" },
            tuesday: { active: true, from: "17:00", to: "01:00" },
            wednesday: { active: true, from: "17:00", to: "01:00" },
            thursday: { active: true, from: "17:00", to: "01:00" },
            friday: { active: false, from: "17:00", to: "01:00" },
            saturday: { active: false, from: "17:00", to: "01:00" }
        };

        const defaultDays3 = {
            sunday: { active: true, from: "10:00", to: "18:00" },
            monday: { active: true, from: "10:00", to: "18:00" },
            tuesday: { active: true, from: "10:00", to: "18:00" },
            wednesday: { active: true, from: "10:00", to: "18:00" },
            thursday: { active: true, from: "10:00", to: "18:00" },
            friday: { active: false, from: "10:00", to: "18:00" },
            saturday: { active: false, from: "10:00", to: "18:00" }
        };

        await db.insert(shifts).values([
            { id: shiftId1, name: "Morning Shift HQ", zone_id: zoneId1, days: defaultDays1 },
            { id: shiftId2, name: "Night Shift HQ", zone_id: zoneId1, days: defaultDays2 },
            { id: shiftId3, name: "Day Shift Branch", zone_id: zoneId2, days: defaultDays3 },
        ]);

        await db.insert(users).values([
            { id: superAdminId, name: "Super Admin", email: "super@gmail.com", phone: "01000000001", password, role: "super_admin", zone_id: zoneId1, shift_id: shiftId1 },
            { id: adminId, name: "Admin", email: "admin@gmail.com", phone: "01000000002", password, role: "admin", zone_id: zoneId1, shift_id: shiftId1 },
            { id: testerId, name: "Tester User", email: "leader@gmail.com", phone: "01000000003", password, role: "tester", zone_id: zoneId1, shift_id: shiftId1 },
            { id: engineerId, name: "Engineer User", email: "user@gmail.com", phone: "01000000004", password, role: "engineer", points: 12, zone_id: zoneId2, shift_id: shiftId3 },
        ]);

        console.log("Seeding settings...");
        await db.insert(settings).values([
            {
                id: uuidv4(),
                user: "Engineer",
                leader: "Team Leader",
                admin: "Administrator",
                task_approve_points: 10,
                task_edit_points: 5,
                task_delay_points: -5
            }
        ]);

        console.log("Seeding projects...");
        const projectId1 = uuidv4();
        const projectId2 = uuidv4();

        await db.insert(projects).values([
            { id: projectId1, name: "Task Manager Project", description: "Internal Task Management", tester_id: testerId },
            { id: projectId2, name: "E-Commerce App", description: "Online shopping platform", tester_id: testerId },
        ]);

        console.log("Seeding projectGroups...");
        const groupId1 = uuidv4();
        const groupId2 = uuidv4();

        await db.insert(projectGroups).values([
            { id: groupId1, name: "Backend Team", description: "API and DB team", project_id: projectId1 },
            { id: groupId2, name: "Frontend Team", description: "UI UX Team", project_id: projectId1 },
        ]);

        console.log("Seeding projectUsers...");
        await db.insert(projectUsers).values([
            { id: uuidv4(), user_id: engineerId, project_id: projectId1 },
            { id: uuidv4(), user_id: adminId, project_id: projectId1 },
            { id: uuidv4(), user_id: engineerId, project_id: projectId2 },
        ]);

        console.log("Seeding groupUsers...");
        await db.insert(groupUsers).values([
            { id: uuidv4(), user_id: engineerId, group_id: groupId1 },
        ]);

        console.log("Seeding tasks...");
        await db.insert(tasks).values([
            { 
                id: uuidv4(), 
                name: "Create Database Schema", 
                description: "Design and implement DB schema", 
                user_id: engineerId, 
                group_id: groupId1, 
                project_id: projectId1, 
                status: "inprogress",
                inprogress_date: new Date(),
                delivery_date: new Date(new Date().setDate(new Date().getDate() + 5))
            },
            { 
                id: uuidv4(), 
                name: "API Authentication", 
                description: "Implement JWT login", 
                user_id: engineerId, 
                group_id: groupId1, 
                project_id: projectId1, 
                status: "done",
                done_date: new Date(),
                delivery_date: new Date()
            },
            { 
                id: uuidv4(), 
                name: "Setup CI/CD Pipeline", 
                description: "Automate deployment process", 
                user_id: engineerId, 
                group_id: groupId1, 
                project_id: projectId1, 
                status: "approve",
                done_date: new Date(new Date().setDate(new Date().getDate() - 2)),
                delivery_date: new Date(),
                is_edit: false,
                extra_points: 2,
                points: 12
            }
        ]);
    },
    rollback: async () => {
        console.log("Rolling back initial data...");
        await db.delete(tasks);
        await db.delete(settings);
        await db.delete(groupUsers);
        await db.delete(projectUsers);
        await db.delete(projectGroups);
        await db.delete(projects);
        await db.delete(users);
        await db.delete(shifts);
        await db.delete(zones);
    }
};
