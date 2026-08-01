"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialDataSeed = void 0;
const db_1 = require("../../models/db");
const users_1 = require("../../models/superadmin/users");
const projects_1 = require("../../models/superadmin/projects");
const projectGroups_1 = require("../../models/superadmin/projectGroups");
const projectUsers_1 = require("../../models/superadmin/projectUsers");
const groupUsers_1 = require("../../models/superadmin/groupUsers");
const tasks_1 = require("../../models/superadmin/tasks");
const settings_1 = require("../../models/superadmin/settings");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
exports.initialDataSeed = {
    name: "01_initial_data",
    run: async () => {
        console.log("Seeding users...");
        const password = await bcrypt_1.default.hash("password123", 10);
        const superAdminId = (0, uuid_1.v4)();
        const adminId = (0, uuid_1.v4)();
        const testerId = (0, uuid_1.v4)();
        const engineerId = (0, uuid_1.v4)();
        await db_1.db.insert(users_1.users).values([
            { id: superAdminId, name: "Super Admin", email: "super@gmail.com", phone: "01000000001", password, role: "super_admin" },
            { id: adminId, name: "Admin", email: "admin@gmail.com", phone: "01000000002", password, role: "admin" },
            { id: testerId, name: "Tester User", email: "leader@gmail.com", phone: "01000000003", password, role: "tester" },
            { id: engineerId, name: "Engineer User", email: "user@gmail.com", phone: "01000000004", password, role: "engineer", points: 12 },
        ]);
        console.log("Seeding settings...");
        await db_1.db.insert(settings_1.settings).values([
            {
                id: (0, uuid_1.v4)(),
                user: "Engineer",
                leader: "Team Leader",
                admin: "Administrator",
                task_approve_points: 10,
                task_edit_points: 5,
                task_delay_points: -5
            }
        ]);
        console.log("Seeding projects...");
        const projectId1 = (0, uuid_1.v4)();
        const projectId2 = (0, uuid_1.v4)();
        await db_1.db.insert(projects_1.projects).values([
            { id: projectId1, name: "Task Manager Project", description: "Internal Task Management", tester_id: testerId },
            { id: projectId2, name: "E-Commerce App", description: "Online shopping platform", tester_id: testerId },
        ]);
        console.log("Seeding projectGroups...");
        const groupId1 = (0, uuid_1.v4)();
        const groupId2 = (0, uuid_1.v4)();
        await db_1.db.insert(projectGroups_1.projectGroups).values([
            { id: groupId1, name: "Backend Team", description: "API and DB team", project_id: projectId1 },
            { id: groupId2, name: "Frontend Team", description: "UI UX Team", project_id: projectId1 },
        ]);
        console.log("Seeding projectUsers...");
        await db_1.db.insert(projectUsers_1.projectUsers).values([
            { id: (0, uuid_1.v4)(), user_id: engineerId, project_id: projectId1 },
            { id: (0, uuid_1.v4)(), user_id: adminId, project_id: projectId1 },
            { id: (0, uuid_1.v4)(), user_id: engineerId, project_id: projectId2 },
        ]);
        console.log("Seeding groupUsers...");
        await db_1.db.insert(groupUsers_1.groupUsers).values([
            { id: (0, uuid_1.v4)(), user_id: engineerId, group_id: groupId1 },
        ]);
        console.log("Seeding tasks...");
        await db_1.db.insert(tasks_1.tasks).values([
            {
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
                id: (0, uuid_1.v4)(),
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
        await db_1.db.delete(tasks_1.tasks);
        await db_1.db.delete(settings_1.settings);
        await db_1.db.delete(groupUsers_1.groupUsers);
        await db_1.db.delete(projectUsers_1.projectUsers);
        await db_1.db.delete(projectGroups_1.projectGroups);
        await db_1.db.delete(projects_1.projects);
        await db_1.db.delete(users_1.users);
    }
};
