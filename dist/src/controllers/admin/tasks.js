"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingTasks = exports.delayTasks = exports.deleteTasks = exports.updateTasks = exports.createTasks = exports.getTaskById = exports.lists = exports.getAllTasks = exports.TaskIdSchema = exports.updateTasksSchema = exports.createTasksSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const deleteImage_1 = require("../../utils/deleteImage");
const zod_1 = require("zod");
const handleImages_1 = require("../../utils/handleImages");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.createTasksSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string({ required_error: "Name is required" })
            .trim()
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters"),
        description: zod_1.z
            .string()
            .trim()
            .max(1000, "Description cannot exceed 1000 characters")
            .nullable()
            .optional(),
        documentation: zod_1.z.string()
            .nullable()
            .optional(),
        tester_note: zod_1.z
            .string()
            .trim()
            .max(1000, "Tester Note cannot exceed 1000 characters")
            .nullable()
            .optional(),
        delivery_date: zod_1.z.coerce
            .date({ invalid_type_error: "Invalid date format" })
            .nullable()
            .optional(),
        project_id: zod_1.z
            .string({ required_error: "Project ID is required" })
            .uuid("Invalid project ID format"),
        group_id: zod_1.z
            .string({ required_error: "Group ID is required" })
            .uuid("Invalid group ID format"),
        status: zod_1.z.enum(["pending", "inprogress", "done", "edit", "approve"], {
            required_error: "Status is required",
            invalid_type_error: "Status must be either 'pending', 'inprogress', 'done', 'edit', 'approve'",
        }),
        importanc_status: zod_1.z.enum(["low", "medium", "high", "urgent"], {
            invalid_type_error: "Importance must be 'low', 'medium', 'high', or 'urgent'"
        }).optional(),
        users_ids: zod_1.z
            .array(zod_1.z.string().uuid("Invalid User ID format inside users_ids"), { required_error: "Users IDs array is required" })
            .min(1, "At least one user ID is required"),
    }),
});
exports.updateTasksSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z
            .string({ required_error: "Task ID is required" })
            .uuid("Invalid Task ID format"),
    }),
    body: zod_1.z
        .object({
        name: zod_1.z
            .string()
            .trim()
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters")
            .optional(),
        documentation: zod_1.z.string()
            .nullable()
            .optional(),
        description: zod_1.z
            .string()
            .trim()
            .max(1000, "Description cannot exceed 1000 characters")
            .nullable()
            .optional(),
        tester_note: zod_1.z
            .string()
            .trim()
            .max(1000, "Tester Note cannot exceed 1000 characters")
            .nullable()
            .optional(),
        delivery_date: zod_1.z.coerce
            .date({ invalid_type_error: "Invalid date format" })
            .nullable()
            .optional(),
        project_id: zod_1.z
            .string()
            .uuid("Invalid project ID format")
            .optional(),
        group_id: zod_1.z
            .string()
            .uuid("Invalid group ID format")
            .optional(),
        user_id: zod_1.z
            .string()
            .uuid("Invalid user ID format")
            .optional(),
        status: zod_1.z
            .enum(["pending", "inprogress", "done", "edit", "approve"], {
            invalid_type_error: "Status must be either 'pending', 'inprogress', 'done', 'edit', 'approve'",
        })
            .optional(),
        importanc_status: zod_1.z
            .enum(["low", "medium", "high", "urgent"], {
            invalid_type_error: "Importance must be 'low', 'medium', 'high', or 'urgent'"
        })
            .optional(),
    })
        .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update",
    }),
});
// Schema للعمليات التي تتطلب Task ID
exports.TaskIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid Task ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get All Tasks
const getAllTasks = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const group_id = req.query.group_id?.trim() || '';
    const project_id = req.query.project_id?.trim() || '';
    const user_id = req.query.user_id?.trim() || '';
    const offset = (page - 1) * limit;
    const whereConditions = [];
    if (search) {
        whereConditions.push((0, drizzle_orm_1.like)(schema_1.tasks.name, `%${search}%`));
    }
    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (group_id && group_id !== 'undefined' && group_id !== 'null') {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, group_id));
    }
    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (project_id && project_id !== 'undefined' && project_id !== 'null') {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.project_id, project_id));
    }
    // 1. التصفية حسب مستخدم معین (إذا وجد)
    if (user_id && user_id !== 'undefined' && user_id !== 'null') {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, user_id));
    }
    let query = db_1.db
        .select({
        id: schema_1.tasks.id,
        name: schema_1.tasks.name,
        description: schema_1.tasks.description,
        documentation: schema_1.tasks.documentation,
        status: schema_1.tasks.status,
        importanc_status: schema_1.tasks.importanc_status,
        delivery_date: schema_1.tasks.delivery_date,
        tester_note: schema_1.tasks.tester_note,
        user_name: schema_1.users.name,
        user_phone: schema_1.users.phone,
        user_id: schema_1.tasks.user_id,
        user_image: schema_1.users.image,
        project_group: schema_1.projectGroups.name,
        project_name: schema_1.projects.name,
    })
        .from(schema_1.tasks)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
        .leftJoin(schema_1.projectGroups, (0, drizzle_orm_1.eq)(schema_1.tasks.group_id, schema_1.projectGroups.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tasks.user_id, schema_1.users.id))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
        .$dynamic();
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
        .from(schema_1.tasks)
        .$dynamic();
    if (whereConditions.length > 0) {
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        query = query.where(combinedCondition);
        countQuery = countQuery.where(combinedCondition);
    }
    const [allTasks, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    (0, response_1.SuccessResponse)(res, {
        tasks: allTasks,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit)
        }
    }, 200);
};
exports.getAllTasks = getAllTasks;
// ✅ Get Options / Dropdown Lists (Projects, Groups, Engineers)
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
    const users_list = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.role, "engineer")); // إصلاح: إضافة التنصيص للنص
    (0, response_1.SuccessResponse)(res, { projects_list, groups_list, users_list }, 200);
};
exports.lists = lists;
// ✅ Get Task By ID
const getTaskById = async (req, res) => {
    const validated = await exports.TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const taskResult = await db_1.db
        .select({
        id: schema_1.tasks.id,
        name: schema_1.tasks.name,
        description: schema_1.tasks.description,
        status: schema_1.tasks.status,
        importanc_status: schema_1.tasks.importanc_status,
        delivery_date: schema_1.tasks.delivery_date,
        tester_note: schema_1.tasks.tester_note,
        project_name: schema_1.projects.name,
        project_id: schema_1.projects.id,
        group_name: schema_1.projectGroups.name,
        group_id: schema_1.projectGroups.id,
        user_name: schema_1.users.name,
        documentation: schema_1.tasks.documentation,
        user_id: schema_1.users.id,
        createdAt: schema_1.tasks.createdAt,
    })
        .from(schema_1.tasks)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
        .leftJoin(schema_1.projectGroups, (0, drizzle_orm_1.eq)(schema_1.tasks.group_id, schema_1.projectGroups.id))
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tasks.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!taskResult[0]) {
        throw new NotFound_1.NotFound("Task not found");
    }
    (0, response_1.SuccessResponse)(res, { task: taskResult[0] }, 200);
};
exports.getTaskById = getTaskById;
// ✅ Create Tasks (Multi-User Duplicate)
const createTasks = async (req, res) => {
    const validated = await exports.createTasksSchema.parseAsync({ body: req.body });
    const { name, description, project_id, group_id, delivery_date, status, importanc_status, tester_note, users_ids, documentation, } = validated.body;
    let savedProjectDocumentation = null;
    if (documentation) {
        const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    }
    const tasksToInsert = users_ids.map((userId) => ({
        name,
        description,
        project_id,
        group_id,
        user_id: userId,
        delivery_date: delivery_date ?? null,
        status,
        importanc_status: importanc_status ?? "medium",
        tester_note: tester_note ?? null,
        documentation: savedProjectDocumentation,
    }));
    await db_1.db.insert(schema_1.tasks).values(tasksToInsert);
    return (0, response_1.SuccessResponse)(res, { message: `${tasksToInsert.length} tasks created successfully` }, 201);
};
exports.createTasks = createTasks;
// ✅ Update Task by ID
const updateTasks = async (req, res) => {
    const validated = await exports.updateTasksSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { name, description, project_id, group_id, user_id, delivery_date, status, importanc_status, tester_note, documentation, } = validated.body;
    const [existingTask] = await db_1.db
        .select()
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!existingTask) {
        throw new NotFound_1.NotFound("Task not found");
    }
    let ProjectDocumentation = existingTask.documentation;
    if (documentation !== undefined) {
        if (documentation) {
            const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingTask.documentation) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingTask.documentation);
            }
            ProjectDocumentation = result.url;
        }
        else {
            ProjectDocumentation = null;
        }
    }
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (description !== undefined)
        updateData.description = description;
    if (project_id !== undefined)
        updateData.project_id = project_id;
    if (group_id !== undefined)
        updateData.group_id = group_id;
    if (user_id !== undefined)
        updateData.user_id = user_id;
    if (delivery_date !== undefined)
        updateData.delivery_date = delivery_date;
    if (status !== undefined)
        updateData.status = status;
    if (importanc_status !== undefined)
        updateData.importanc_status = importanc_status;
    if (tester_note !== undefined)
        updateData.tester_note = tester_note;
    if (documentation !== undefined)
        updateData.documentation = ProjectDocumentation;
    if (Object.keys(updateData).length === 0) {
        return (0, response_1.SuccessResponse)(res, { message: "No fields provided for update" }, 200);
    }
    await db_1.db.update(schema_1.tasks).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Task updated successfully" }, 200);
};
exports.updateTasks = updateTasks;
// ✅ Delete Task by ID
const deleteTasks = async (req, res) => {
    const validated = await exports.TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingTask = await db_1.db
        .select()
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!existingTask[0]) {
        throw new NotFound_1.NotFound("Task not found");
    }
    if (existingTask[0].documentation) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingTask[0].documentation);
    }
    await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Task deleted successfully" }, 200);
};
exports.deleteTasks = deleteTasks;
const delayTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const project_id = req.query.project_id?.trim() || '';
        const user_id = req.query.user_id?.trim() || '';
        const offset = (page - 1) * limit;
        // 1. بناء الشروط: نضع شرط التأخير كشرط أساسي دائماً
        const whereConditions = [
            (0, drizzle_orm_1.lte)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `NOW()`)
        ];
        if (search) {
            whereConditions.push((0, drizzle_orm_1.like)(schema_1.tasks.name, `%${search}%`));
        }
        // 1. التصفية حسب مشروع معین (إذا وجد)
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.project_id, project_id));
        }
        // 1. التصفية حسب مستخدم معین (إذا وجد)
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, user_id));
        }
        // دمج جميع الشروط
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db_1.db
            .select({
            id: schema_1.tasks.id,
            name: schema_1.tasks.name,
            description: schema_1.tasks.description,
            status: schema_1.tasks.status,
            importanc_status: schema_1.tasks.importanc_status,
            delivery_date: schema_1.tasks.delivery_date,
            tester_note: schema_1.tasks.tester_note,
            user_name: schema_1.users.name,
            user_image: schema_1.users.image,
            user_phone: schema_1.users.phone,
            user_id: schema_1.tasks.user_id,
            project_group: schema_1.projectGroups.name,
            project_name: schema_1.projects.name,
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
            .leftJoin(schema_1.projectGroups, (0, drizzle_orm_1.eq)(schema_1.tasks.group_id, schema_1.projectGroups.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tasks.user_id, schema_1.users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy((0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
            .$dynamic();
        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db_1.db
            .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
            .from(schema_1.tasks)
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();
        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);
        (0, response_1.SuccessResponse)(res, {
            tasks: allTasks,
            pagination: {
                total: Number(totalCount),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount) / limit)
            }
        }, 200);
    }
    catch (error) {
        // معالجة الخطأ لتجنب توقف الخادم
        console.error("Error fetching delayed tasks:", error);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي في الخادم" });
    }
};
exports.delayTasks = delayTasks;
const pendingTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const project_id = req.query.project_id?.trim() || '';
        const user_id = req.query.user_id?.trim() || '';
        const offset = (page - 1) * limit;
        // 1. بناء الشروط: نضع شرط التأخير كشرط أساسي دائماً
        const whereConditions = [
            (0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve")
        ];
        if (search) {
            whereConditions.push((0, drizzle_orm_1.like)(schema_1.tasks.name, `%${search}%`));
        }
        // 1. التصفية حسب مشروع معین (إذا وجد)
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.project_id, project_id));
        }
        // 1. التصفية حسب مستخدم معین (إذا وجد)
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, user_id));
        }
        // دمج جميع الشروط
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db_1.db
            .select({
            id: schema_1.tasks.id,
            name: schema_1.tasks.name,
            description: schema_1.tasks.description,
            status: schema_1.tasks.status,
            importanc_status: schema_1.tasks.importanc_status,
            delivery_date: schema_1.tasks.delivery_date,
            tester_note: schema_1.tasks.tester_note,
            user_name: schema_1.users.name,
            user_image: schema_1.users.image,
            user_phone: schema_1.users.phone,
            user_id: schema_1.tasks.user_id,
            project_group: schema_1.projectGroups.name,
            project_name: schema_1.projects.name,
        })
            .from(schema_1.tasks)
            .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
            .leftJoin(schema_1.projectGroups, (0, drizzle_orm_1.eq)(schema_1.tasks.group_id, schema_1.projectGroups.id))
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.tasks.user_id, schema_1.users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy((0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
            .$dynamic();
        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db_1.db
            .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
            .from(schema_1.tasks)
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();
        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);
        (0, response_1.SuccessResponse)(res, {
            tasks: allTasks,
            pagination: {
                total: Number(totalCount),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount) / limit)
            }
        }, 200);
    }
    catch (error) {
        // معالجة الخطأ لتجنب توقف الخادم
        console.error("Error fetching delayed tasks:", error);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي في الخادم" });
    }
};
exports.pendingTasks = pendingTasks;
