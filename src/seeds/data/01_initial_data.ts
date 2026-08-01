import { db } from "../../models/db";
import { users } from "../../models/superadmin/users";
import { projects } from "../../models/superadmin/projects";
import { projectGroups } from "../../models/superadmin/projectGroups";
import { projectUsers } from "../../models/superadmin/projectUsers";
import { groupUsers } from "../../models/superadmin/groupUsers";
import { tasks } from "../../models/superadmin/tasks";
import { settings } from "../../models/superadmin/settings";
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

        await db.insert(users).values([
            { id: superAdminId, name: "Super Admin", email: "super@test.com", phone: "01000000001", password, role: "super_admin" },
            { id: adminId, name: "Admin", email: "admin@test.com", phone: "01000000002", password, role: "admin" },
            { id: testerId, name: "Tester User", email: "tester@test.com", phone: "01000000003", password, role: "tester" },
            { id: engineerId, name: "Engineer User", email: "engineer@test.com", phone: "01000000004", password, role: "engineer", points: 12 },
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
    }
};
