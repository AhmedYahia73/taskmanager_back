"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectUsers = exports.deleteProject = exports.updateProject = exports.createProject = exports.lists = exports.getProjectById = exports.getAllProject = exports.ProjectIdSchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
// الـ Schema الخاص بإنشاء مشروع (Project) جديد
exports.createProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters"),
        description: zod_1.z.string()
            .max(1000, "Description cannot exceed 1000 characters")
            .nullable()
            .optional(),
        documentation: zod_1.z.string({ required_error: "Documentation is required" }),
        tester_id: zod_1.z.string({ required_error: "Tester ID is required" }).uuid("Invalid tester ID format"),
        users_ids: zod_1.z
            .array(zod_1.z.string().uuid("Invalid User ID format inside users_ids"), { required_error: "Users IDs array is required" })
            .min(1, "At least one user ID is required"),
    }),
});
// 🛡️ الـ Schema الخاص بتحديث مشروع (Project)
exports.updateProjectSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
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
        documentation: zod_1.z.string()
            .nullable()
            .optional(),
        tester_id: zod_1.z.string()
            .uuid("Invalid tester ID format")
            .nullable()
            .optional(),
        users_ids: zod_1.z
            .array(zod_1.z.string().uuid("Invalid User ID format inside users_ids"))
            .optional(),
    }),
});
// الـ Schema للعمليات التي تتطلب المعرف ID فقط في الـ parameters
exports.ProjectIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Projects With Progress Percentage
const getAllProject = async (req, res) => {
    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    const whereConditions = [];
    // تطبيق البحث بالاسم في حال وجوده
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.like)(schema_1.projects.name, searchPattern));
    }
    // بناء استعلام البيانات الأساسي مع نسبة الإنجاز
    let query = db_1.db
        .select({
        id: schema_1.projects.id,
        name: schema_1.projects.name,
        description: schema_1.projects.description,
        documentation: schema_1.projects.documentation,
        createdAt: schema_1.projects.createdAt,
        tester_image: schema_1.users.image,
        tester_name: schema_1.users.name,
        // 📊 حساب نسبة الإنجاز %
        progress: (0, drizzle_orm_1.sql) `
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${schema_1.tasks.status} = 'approved' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${schema_1.tasks.id}), 0)
                    , 2), 
                    0
                )
            `
    })
        .from(schema_1.projects)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.projects.tester_id, schema_1.users.id))
        .leftJoin(schema_1.tasks, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
        .groupBy(schema_1.projects.id, schema_1.users.id)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.projects.createdAt))
        .$dynamic();
    // بناء استعلام الـ Count للحصول على إجمالي عدد المشروعات الفريدة
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)((0, drizzle_orm_1.sql) `DISTINCT ${schema_1.projects.id}`) })
        .from(schema_1.projects)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.projects.tester_id, schema_1.users.id))
        .$dynamic();
    // ربط شروط البحث بالاستعلامات
    if (whereConditions.length > 0) {
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        query = query.where(combinedCondition);
        countQuery = countQuery.where(combinedCondition);
    }
    // تنفيذ الاستعلامين بالتوازي
    const [allProjects, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    // إرسال النتيجة مع معلومات الـ Pagination
    (0, response_1.SuccessResponse)(res, {
        Projects: allProjects,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit)
        }
    }, 200);
};
exports.getAllProject = getAllProject;
// ✅ Get Project By ID With Progress Percentage
const getProjectById = async (req, res) => {
    // 1. التحقق من صحة المعرف من الـ Schema
    const validated = await exports.ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    // 2. تنفيذ استعلام جلب بيانات المشروع ونسبة الإنجاز
    const Project = await db_1.db
        .select({
        id: schema_1.projects.id,
        name: schema_1.projects.name,
        description: schema_1.projects.description,
        documentation: schema_1.projects.documentation,
        createdAt: schema_1.projects.createdAt,
        tester_image: schema_1.users.image,
        tester_name: schema_1.users.name,
        tester_id: schema_1.users.id,
        // 📊 حساب نسبة الإنجاز %
        progress: (0, drizzle_orm_1.sql) `
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${schema_1.tasks.status} = 'approved' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${schema_1.tasks.id}), 0)
                    , 2), 
                    0
                )
            `
    })
        .from(schema_1.projects)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.projects.tester_id, schema_1.users.id))
        .leftJoin(schema_1.tasks, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
        .where((0, drizzle_orm_1.eq)(schema_1.projects.id, id))
        .groupBy(schema_1.projects.id, schema_1.users.id)
        .limit(1);
    // 3. التحقق من وجود المشروع
    if (!Project[0]) {
        throw new NotFound_1.NotFound("Project not found");
    }
    // 4. إرسال الاستجابة بنجاح
    (0, response_1.SuccessResponse)(res, { Project: Project[0] }, 200);
};
exports.getProjectById = getProjectById;
// ✅ Get Group By ID
const lists = async (req, res) => {
    const testers = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "tester"));
    const users_list = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"));
    (0, response_1.SuccessResponse)(res, { testers, users_list }, 200);
};
exports.lists = lists;
// ✅ Create Project
const createProject = async (req, res) => {
    const validated = await exports.createProjectSchema.parseAsync({ body: req.body });
    const { name, description, documentation, tester_id, users_ids } = validated.body;
    let savedProjectDocumentation = null;
    if (documentation) {
        const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    }
    const projectId = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.projects).values({
        id: projectId,
        name,
        description,
        tester_id,
        documentation: savedProjectDocumentation,
    });
    if (users_ids && users_ids.length > 0) {
        const projectUsersData = users_ids.map(userId => ({
            project_id: projectId,
            user_id: userId
        }));
        await db_1.db.insert(schema_1.projectUsers).values(projectUsersData);
    }
    (0, response_1.SuccessResponse)(res, { message: "Project created successfully" }, 201);
};
exports.createProject = createProject;
// ✅ Update Project
const updateProject = async (req, res) => {
    const validated = await exports.updateProjectSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { name, description, documentation, tester_id, users_ids } = validated.body;
    // تحقق من وجود المشروع
    const existingProject = await db_1.db
        .select()
        .from(schema_1.projects)
        .where((0, drizzle_orm_1.eq)(schema_1.projects.id, id))
        .limit(1);
    if (!existingProject[0]) {
        throw new NotFound_1.NotFound("Project not found");
    }
    let ProjectDocumentation = existingProject[0].documentation;
    if (documentation !== undefined) {
        if (documentation) {
            const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingProject[0].documentation) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingProject[0].documentation);
            }
            ProjectDocumentation = result.url;
        }
        else {
            ProjectDocumentation = null;
        }
    }
    // بناء كائن التحديث بشكل يحافظ على البيانات الحالية في حال عدم إرسالها
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (tester_id !== undefined)
        updateData.tester_id = tester_id;
    if (documentation !== undefined)
        updateData.documentation = ProjectDocumentation;
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.projects).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.projects.id, id));
    }
    if (users_ids !== undefined) {
        await db_1.db.delete(schema_1.projectUsers).where((0, drizzle_orm_1.eq)(schema_1.projectUsers.project_id, id));
        if (users_ids.length > 0) {
            const projectUsersData = users_ids.map(userId => ({
                project_id: id,
                user_id: userId
            }));
            await db_1.db.insert(schema_1.projectUsers).values(projectUsersData);
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Project updated successfully" }, 200);
};
exports.updateProject = updateProject;
// ✅ Delete Project
const deleteProject = async (req, res) => {
    const validated = await exports.ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingProject = await db_1.db
        .select()
        .from(schema_1.projects)
        .where((0, drizzle_orm_1.eq)(schema_1.projects.id, id))
        .limit(1);
    if (!existingProject[0]) {
        throw new NotFound_1.NotFound("Project not found");
    }
    // حذف ملف التوثيق/الصورة من السيرفر قبل المسح
    if (existingProject[0].documentation) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingProject[0].documentation);
    }
    await db_1.db.delete(schema_1.projects).where((0, drizzle_orm_1.eq)(schema_1.projects.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Project deleted successfully" }, 200);
};
exports.deleteProject = deleteProject;
// ✅ Get Project Users
const getProjectUsers = async (req, res) => {
    const validated = await exports.ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const project_users = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        role: schema_1.users.role,
        image: schema_1.users.image
    })
        .from(schema_1.projectUsers)
        .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.projectUsers.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.projectUsers.project_id, id));
    (0, response_1.SuccessResponse)(res, { users: project_users }, 200);
};
exports.getProjectUsers = getProjectUsers;
