"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupUsers = exports.deleteProjectGroup = exports.deleteProjectGroupDocumentation = exports.updateProjectGroup = exports.createProjectGroup = exports.getGroupById = exports.lists = exports.getAllGroup = exports.GroupIdSchema = exports.ProjectIdSchema = exports.updateProjectGroupSchema = exports.createProjectGroupSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const deleteImage_1 = require("../../utils/deleteImage");
const handleImages_1 = require("../../utils/handleImages");
const upload_1 = require("../../middlewares/upload");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
// Schema لإنشاء مجموعة مشروع (Project Group)
exports.createProjectGroupSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters"),
        description: zod_1.z.string()
            .max(1000, "Description cannot exceed 1000 characters")
            .nullable()
            .optional(),
        documentation: zod_1.z.any()
            .nullable()
            .optional(),
        project_id: zod_1.z.string({ required_error: "Project ID is required" }).uuid("Invalid project ID format"),
        users_ids: zod_1.z.preprocess(upload_1.parseArray, zod_1.z.array(zod_1.z.string().uuid("Invalid User ID format inside users_ids"), { required_error: "Users IDs array is required" })
            .min(1, "At least one user ID is required")),
    }),
});
// Schema لتحديث مجموعة مشروع (Project Group)
exports.updateProjectGroupSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Group ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters")
            .optional(),
        description: zod_1.z.string()
            .max(1000, "Description cannot exceed 1000 characters")
            .nullable()
            .optional(),
        documentation: zod_1.z.any()
            .nullable()
            .optional(),
        project_id: zod_1.z.string()
            .uuid("Invalid project ID format")
            .nullable()
            .optional(),
        users_ids: zod_1.z.preprocess(upload_1.parseArray, zod_1.z.array(zod_1.z.string().uuid("Invalid User ID format inside users_ids")).optional()),
    }),
});
// Schema للعمليات التي تتطلب Project ID
exports.ProjectIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
    }),
});
// Schema للعمليات التي تتطلب Group ID
exports.GroupIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Group ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Groups
const getAllGroup = async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const search = req.query.search?.trim() || '';
    const project_id = req.query.project_id?.trim() || '';
    const offset = (page - 1) * limit;
    const whereConditions = [];
    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (project_id) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.projectGroups.project_id, project_id));
    }
    // 2. البحث باسم المجموعات
    if (search) {
        whereConditions.push((0, drizzle_orm_1.like)(schema_1.projectGroups.name, `%${search}%`));
    }
    if ((req.user?.role === 'engineer' || req.user?.role === 'leader_sales') && req.user?.id) {
        const userProjectsSubquery = db_1.db.select({ project_id: schema_1.projectUsers.project_id }).from(schema_1.projectUsers).where((0, drizzle_orm_1.eq)(schema_1.projectUsers.user_id, req.user.id));
        const userGroupsSubquery = db_1.db.select({ group_id: schema_1.groupUsers.group_id }).from(schema_1.groupUsers).where((0, drizzle_orm_1.eq)(schema_1.groupUsers.user_id, req.user.id));
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, req.user.id), (0, drizzle_orm_1.inArray)(schema_1.projects.id, userProjectsSubquery), (0, drizzle_orm_1.inArray)(schema_1.projectGroups.id, userGroupsSubquery)));
    }
    // دمج كافة الشروط في شرط واحد متكامل
    const combinedWhere = whereConditions.length > 0 ? (0, drizzle_orm_1.and)(...whereConditions) : undefined;
    // 3. بناء الاستعلام الأساسي
    let query = db_1.db
        .select({
        id: schema_1.projectGroups.id,
        name: schema_1.projectGroups.name,
        description: schema_1.projectGroups.description,
        documentation: schema_1.projectGroups.documentation,
        project: schema_1.projects.name,
        project_id: schema_1.projects.id,
        tester_id: schema_1.projects.tester_id,
        createdAt: schema_1.projectGroups.createdAt,
        delay_tasks: (0, drizzle_orm_1.sql) `(SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.delivery_date < CURRENT_DATE() AND tasks.status != 'approve')`.as('delay_tasks'),
        progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id), 0) * 100, 0)`.as('progress'),
        done_progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id), 0) * 100, 0)`.as('done_progress')
    })
        .from(schema_1.projectGroups)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.projectGroups.project_id, schema_1.projects.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.projectGroups.createdAt))
        .$dynamic();
    // 4. بناء استعلام العد الكلي
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)(schema_1.projectGroups.id) })
        .from(schema_1.projectGroups)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.projectGroups.project_id, schema_1.projects.id))
        .$dynamic();
    // تطبيق الشروط الموحدة على الاستعلامين
    if (combinedWhere) {
        query = query.where(combinedWhere);
        countQuery = countQuery.where(combinedWhere);
    }
    // تنفيذ الاستعلامين بالتوازي
    const [allGroups, countResult] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    const currentUserId = req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const mappedGroups = allGroups.map(group => {
        let user_role = 'engineer';
        if (isGlobalAdmin) {
            user_role = 'admin';
        }
        else if (group.tester_id === currentUserId) {
            user_role = 'leader';
        }
        else {
            user_role = 'engineer';
        }
        return {
            ...group,
            user_role
        };
    });
    const totalCount = countResult[0]?.total ? Number(countResult[0].total) : 0;
    return (0, response_1.SuccessResponse)(res, {
        groups: mappedGroups,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 1
        }
    }, 200);
};
exports.getAllGroup = getAllGroup;
// ✅ Get Group By ID
const lists = async (req, res) => {
    const projects_list = await db_1.db
        .select({
        id: schema_1.projects.id,
        name: schema_1.projects.name,
    })
        .from(schema_1.projects);
    const groups_list = await db_1.db
        .select({
        id: schema_1.projectGroups.id,
        name: schema_1.projectGroups.name,
    })
        .from(schema_1.projectGroups);
    const nonAdminCondition = (0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_1.users.role, "admin"), (0, drizzle_orm_1.ne)(schema_1.users.role, "super_admin"));
    const users_list = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        role: schema_1.users.role,
    })
        .from(schema_1.users)
        .where(nonAdminCondition);
    (0, response_1.SuccessResponse)(res, { projects_list, groups_list, users_list }, 200);
};
exports.lists = lists;
// ✅ Get Group By ID
const getGroupById = async (req, res) => {
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const groups = await db_1.db
        .select({
        id: schema_1.projectGroups.id,
        name: schema_1.projectGroups.name,
        description: schema_1.projectGroups.description,
        documentation: schema_1.projectGroups.documentation,
        project: schema_1.projects.name,
        project_id: schema_1.projects.id,
        tester_id: schema_1.projects.tester_id,
        createdAt: schema_1.projectGroups.createdAt,
    })
        .from(schema_1.projectGroups)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.projectGroups.project_id, schema_1.projects.id))
        .where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id))
        .limit(1);
    if (!groups[0]) {
        throw new NotFound_1.NotFound("Project Group not found");
    }
    const currentUserId = req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    let user_role = 'engineer';
    if (isGlobalAdmin) {
        user_role = 'admin';
    }
    else if (groups[0].tester_id === currentUserId) {
        user_role = 'leader';
    }
    else {
        user_role = 'engineer';
    }
    (0, response_1.SuccessResponse)(res, { group: { ...groups[0], user_role } }, 200);
};
exports.getGroupById = getGroupById;
// ✅ Create Project Group
const createProjectGroup = async (req, res) => {
    const validated = await exports.createProjectGroupSchema.parseAsync({ body: req.body });
    const { name, description, project_id, users_ids, documentation } = validated.body;
    // Check project exists & user permission (must be admin or project leader)
    const [project] = await db_1.db.select().from(schema_1.projects).where((0, drizzle_orm_1.eq)(schema_1.projects.id, project_id)).limit(1);
    if (!project) {
        throw new NotFound_1.NotFound("Project not found");
    }
    const isLeader = project.tester_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    if (!isAdmin && !isLeader) {
        return res.status(403).json({ success: false, message: "Forbidden: Only project leaders or admins can create groups" });
    }
    let savedProjectDocumentation = null;
    if (req.file) {
        savedProjectDocumentation = (0, upload_1.getFileUrl)(req, req.file, "projects");
    }
    else if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    }
    else if (typeof documentation === "string" && documentation && documentation !== "null" && documentation !== "undefined") {
        savedProjectDocumentation = documentation;
    }
    const groupId = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.projectGroups).values({
        id: groupId,
        name,
        description,
        project_id,
        documentation: savedProjectDocumentation,
    });
    if (users_ids && users_ids.length > 0) {
        const groupUsersData = users_ids.map(userId => ({
            group_id: groupId,
            user_id: userId
        }));
        await db_1.db.insert(schema_1.groupUsers).values(groupUsersData);
    }
    (0, response_1.SuccessResponse)(res, { message: "Project group created successfully" }, 201);
};
exports.createProjectGroup = createProjectGroup;
// ✅ Update Project Group
const updateProjectGroup = async (req, res) => {
    const validated = await exports.updateProjectGroupSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { name, description, project_id, users_ids, documentation } = validated.body;
    const existingGroup = await db_1.db
        .select()
        .from(schema_1.projectGroups)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.projectGroups.project_id, schema_1.projects.id))
        .where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id))
        .limit(1);
    if (!existingGroup[0]) {
        throw new NotFound_1.NotFound("Project group not found");
    }
    const isLeader = existingGroup[0].projects?.tester_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    if (!isAdmin && !isLeader) {
        return res.status(403).json({ success: false, message: "Forbidden: Only project leaders or admins can update groups" });
    }
    const groupRecord = existingGroup[0].projectGroups;
    let ProjectDocumentation = groupRecord.documentation;
    const shouldDeleteDoc = req.body.delete_documentation === "true" ||
        req.body.delete_documentation === true ||
        documentation === "" ||
        documentation === null ||
        documentation === "null";
    if (req.file) {
        ProjectDocumentation = (0, upload_1.getFileUrl)(req, req.file, "projects");
        if (groupRecord.documentation) {
            await (0, deleteImage_1.deletePhotoFromServer)(groupRecord.documentation);
        }
    }
    else if (shouldDeleteDoc) {
        if (groupRecord.documentation) {
            await (0, deleteImage_1.deletePhotoFromServer)(groupRecord.documentation);
        }
        ProjectDocumentation = null;
    }
    else if (documentation !== undefined) {
        if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
            const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
            if (groupRecord.documentation) {
                await (0, deleteImage_1.deletePhotoFromServer)(groupRecord.documentation);
            }
            ProjectDocumentation = result.url;
        }
    }
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (project_id !== undefined)
        updateData.project_id = project_id;
    if (req.file || shouldDeleteDoc || documentation !== undefined)
        updateData.documentation = ProjectDocumentation;
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.projectGroups).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id));
    }
    if (users_ids !== undefined) {
        await db_1.db.delete(schema_1.groupUsers).where((0, drizzle_orm_1.eq)(schema_1.groupUsers.group_id, id));
        if (users_ids.length > 0) {
            const groupUsersData = users_ids.map(userId => ({
                group_id: id,
                user_id: userId
            }));
            await db_1.db.insert(schema_1.groupUsers).values(groupUsersData);
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Project group updated successfully" }, 200);
};
exports.updateProjectGroup = updateProjectGroup;
// ✅ Delete Project Group Documentation
const deleteProjectGroupDocumentation = async (req, res) => {
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const [group] = await db_1.db
        .select()
        .from(schema_1.projectGroups)
        .where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id))
        .limit(1);
    if (!group) {
        throw new NotFound_1.NotFound("Project group not found");
    }
    if (group.documentation) {
        // 1. Delete from server disk first
        await (0, deleteImage_1.deletePhotoFromServer)(group.documentation);
        // 2. Delete from database
        await db_1.db.update(schema_1.projectGroups).set({ documentation: null }).where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id));
    }
    (0, response_1.SuccessResponse)(res, { message: "Project group documentation deleted successfully" }, 200);
};
exports.deleteProjectGroupDocumentation = deleteProjectGroupDocumentation;
// ✅ Delete Project Group
const deleteProjectGroup = async (req, res) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Only admins can delete groups" });
    }
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingGroup = await db_1.db
        .select()
        .from(schema_1.projectGroups)
        .where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id))
        .limit(1);
    if (!existingGroup[0]) {
        throw new NotFound_1.NotFound("Project group not found");
    }
    // حذف ملف التوثيق/الصورة من السيرفر قبل المسح
    if (existingGroup[0].documentation) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingGroup[0].documentation);
    }
    // حذف التوثيق إذا كان موجوداً
    if (existingGroup[0].documentation) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingGroup[0].documentation);
    }
    await db_1.db.delete(schema_1.projectGroups).where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Project group deleted successfully" }, 200);
};
exports.deleteProjectGroup = deleteProjectGroup;
// ✅ Get Group Users
const getGroupUsers = async (req, res) => {
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const group_users = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        image: schema_1.users.image
    })
        .from(schema_1.groupUsers)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.groupUsers.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.groupUsers.group_id, id));
    (0, response_1.SuccessResponse)(res, { users: group_users }, 200);
};
exports.getGroupUsers = getGroupUsers;
