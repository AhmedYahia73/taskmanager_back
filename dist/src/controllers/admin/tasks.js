"use strict";
// src/controllers/Project/ProjectController.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderTasks = exports.pendingTasks = exports.delayTasks = exports.getTaskVoices = exports.deleteTaskVoice = exports.addTaskVoice = exports.deleteTaskDocumentation = exports.deleteTasks = exports.updateTasks = exports.createTasks = exports.getTaskById = exports.lists = exports.todayTasks = exports.getAllTasks = exports.TaskIdSchema = exports.updateTasksSchema = exports.createTasksSchema = exports.dateInputSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const deleteImage_1 = require("../../utils/deleteImage");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const handleImages_1 = require("../../utils/handleImages");
const upload_1 = require("../../middlewares/upload");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.dateInputSchema = zod_1.z.preprocess((val) => {
    if (!val || val === '' || val === 'null' || val === 'undefined')
        return null;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match)
            return match[1];
        const d = new Date(trimmed);
        if (!isNaN(d.getTime()))
            return d.toISOString().split('T')[0];
    }
    if (val instanceof Date && !isNaN(val.getTime())) {
        return val.toISOString().split('T')[0];
    }
    return val;
}, zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)").nullable().optional());
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
        documentation: zod_1.z.any()
            .nullable()
            .optional(),
        tester_note: zod_1.z
            .string()
            .trim()
            .max(1000, "Tester Note cannot exceed 1000 characters")
            .nullable()
            .optional(),
        delivery_date: exports.dateInputSchema,
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
        sort: zod_1.z.preprocess((val) => {
            if (val === undefined || val === null || val === '')
                return undefined;
            const num = Number(val);
            return isNaN(num) ? undefined : num;
        }, zod_1.z.number().int().optional().nullable()),
        users_ids: zod_1.z.preprocess(upload_1.parseArray, zod_1.z.array(zod_1.z.string().uuid("Invalid User ID format inside users_ids"), { required_error: "Users IDs array is required" }).min(1, "At least one user ID is required")),
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
        documentation: zod_1.z.any()
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
        delivery_date: exports.dateInputSchema,
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
        users_ids: zod_1.z.preprocess(upload_1.parseArray, zod_1.z.array(zod_1.z.string().uuid("Invalid User ID format inside users_ids")).min(1, "At least one user ID is required")).optional(),
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
        sort: zod_1.z.preprocess((val) => {
            if (val === undefined || val === null || val === '')
                return undefined;
            const num = Number(val);
            return isNaN(num) ? undefined : num;
        }, zod_1.z.number().int().optional().nullable()),
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
    const status = req.query.status?.trim() || '';
    if (status) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.status, status));
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
    if (req.user?.role === 'tester' && req.user?.id) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, req.user.id));
    }
    if (req.user?.role === 'engineer' && req.user?.id) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, req.user.id));
    }
    const hasGroupId = group_id && group_id !== 'undefined' && group_id !== 'null';
    const orderCriteria = hasGroupId
        ? [
            (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.sort} IS NOT NULL AND ${schema_1.tasks.sort} > 0 THEN 0 ELSE 1 END ASC`,
            (0, drizzle_orm_1.asc)(schema_1.tasks.sort),
            (0, drizzle_orm_1.desc)(schema_1.tasks.createdAt)
        ]
        : [
            (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.sort} IS NOT NULL AND ${schema_1.tasks.sort} > 0 THEN 0 ELSE 1 END ASC`,
            (0, drizzle_orm_1.asc)(schema_1.tasks.sort),
            (0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.importanc_status} = 'urgent' AND ${schema_1.tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`,
            (0, drizzle_orm_1.desc)(schema_1.tasks.delivery_date),
            (0, drizzle_orm_1.desc)(schema_1.tasks.createdAt)
        ];
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
        sort: schema_1.tasks.sort,
        createdAt: schema_1.tasks.createdAt,
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
        .orderBy(...orderCriteria)
        .$dynamic();
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
        .from(schema_1.tasks)
        .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
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
const todayTasks = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const project_id = req.query.project_id?.trim() || '';
        const user_id = req.query.user_id?.trim() || '';
        const offset = (page - 1) * limit;
        const whereConditions = [
            (0, drizzle_orm_1.eq)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`),
            (0, drizzle_orm_1.ne)(schema_1.tasks.status, "approve")
        ];
        if (search) {
            whereConditions.push((0, drizzle_orm_1.like)(schema_1.tasks.name, `%${search}%`));
        }
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.project_id, project_id));
        }
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, user_id));
        }
        if (req.user?.role === 'tester' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, req.user.id));
        }
        if (req.user?.role === 'engineer' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, req.user.id));
        }
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
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
            .where(combinedCondition)
            .orderBy((0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.importanc_status} = 'urgent' AND ${schema_1.tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`, (0, drizzle_orm_1.desc)(schema_1.tasks.delivery_date), (0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
            .$dynamic();
        let countQuery = db_1.db
            .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
            .from(schema_1.tasks)
            .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
            .where(combinedCondition)
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
        res.status(500).json({ success: false, message: "Server Error", error });
    }
};
exports.todayTasks = todayTasks;
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
        sort: schema_1.tasks.sort,
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
    const task = taskResult[0];
    let siblingTaskIds = [id];
    let users_ids = [];
    if (task.group_id && task.name) {
        const siblings = await db_1.db
            .select({ id: schema_1.tasks.id, user_id: schema_1.tasks.user_id })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, task.group_id), (0, drizzle_orm_1.eq)(schema_1.tasks.name, task.name)));
        siblingTaskIds = siblings.map(s => s.id);
        users_ids = siblings
            .map(s => s.user_id)
            .filter((uid) => Boolean(uid));
    }
    if (task.user_id && !users_ids.includes(task.user_id)) {
        users_ids.push(task.user_id);
    }
    users_ids = Array.from(new Set(users_ids));
    siblingTaskIds = Array.from(new Set(siblingTaskIds));
    if (!siblingTaskIds.includes(id)) {
        siblingTaskIds.push(id);
    }
    // Fetch assigned users (only lean fields: id, name, image, role)
    let assigned_users = [];
    if (users_ids.length > 0) {
        assigned_users = await db_1.db
            .select({
            id: schema_1.users.id,
            name: schema_1.users.name,
            image: schema_1.users.image,
            role: schema_1.users.role,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.inArray)(schema_1.users.id, users_ids));
    }
    // Fetch voices for this task (including any sibling tasks with same group_id and name)
    let voices = [];
    try {
        voices = await db_1.db
            .select({
            id: schema_1.taskVoices.id,
            voice_url: schema_1.taskVoices.voice_url,
            duration: schema_1.taskVoices.duration,
            createdAt: schema_1.taskVoices.createdAt,
            user_id: schema_1.users.id,
            user_name: schema_1.users.name,
            user_image: schema_1.users.image,
            user_role: schema_1.users.role,
        })
            .from(schema_1.taskVoices)
            .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.taskVoices.user_id, schema_1.users.id))
            .where((0, drizzle_orm_1.inArray)(schema_1.taskVoices.task_id, siblingTaskIds))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.taskVoices.createdAt));
    }
    catch (err) {
        console.warn("Voices table might not exist yet:", err);
    }
    const safeVoices = Array.isArray(voices) ? voices.filter(v => Boolean(v && v.id)) : [];
    const safeAssignedUsers = Array.isArray(assigned_users) ? assigned_users.filter(u => Boolean(u && u.id)) : [];
    (0, response_1.SuccessResponse)(res, { task: { ...task, users_ids, assigned_users: safeAssignedUsers, voices: safeVoices } }, 200);
};
exports.getTaskById = getTaskById;
// ✅ Create Tasks (Multi-User Duplicate)
const createTasks = async (req, res) => {
    const validated = await exports.createTasksSchema.parseAsync({ body: req.body });
    const { name, description, project_id, group_id, delivery_date, status, importanc_status, tester_note, users_ids, documentation, sort, } = validated.body;
    let final_users_ids = users_ids;
    if (req.user?.role === 'engineer' && req.user?.id) {
        final_users_ids = [req.user.id];
    }
    else {
        final_users_ids = Array.from(new Set(final_users_ids));
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
    let inprogress_date = null;
    let done_date = null;
    let task_points = 0;
    let pointsToAdd = 0;
    let is_edit = false;
    if (status === 'inprogress') {
        inprogress_date = new Date();
    }
    else if (status === 'done') {
        done_date = new Date();
    }
    else if (status === 'edit') {
        is_edit = true;
    }
    else if (status === 'approve') {
        const [setting] = await db_1.db.select().from(schema_1.settings).limit(1);
        const task_approve_points = setting?.task_approve_points || 0;
        const task_delay_points = setting?.task_delay_points || 0;
        const doneDateMillis = new Date().getTime();
        const deliveryDateMillis = delivery_date ? (typeof delivery_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(delivery_date) ? new Date(`${delivery_date}T23:59:59`).getTime() : new Date(delivery_date).getTime()) : new Date().getTime();
        if (doneDateMillis >= deliveryDateMillis) {
            pointsToAdd = task_approve_points;
        }
        else {
            pointsToAdd = task_delay_points;
        }
        task_points = pointsToAdd;
    }
    let task_sort = sort;
    if (task_sort === undefined || task_sort === null) {
        const [maxSortResult] = await db_1.db
            .select({ maxSort: (0, drizzle_orm_1.sql) `MAX(${schema_1.tasks.sort})` })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, group_id));
        const maxSort = maxSortResult?.maxSort ?? 0;
        task_sort = maxSort > 0 ? maxSort + 1 : 0;
    }
    const tasksToInsert = final_users_ids.map((userId) => ({
        id: (0, uuid_1.v4)(),
        name,
        description,
        project_id,
        group_id,
        user_id: userId,
        delivery_date: delivery_date ?? null,
        status,
        importanc_status: importanc_status ?? "medium",
        tester_note: tester_note ?? null,
        sort: task_sort,
        documentation: savedProjectDocumentation,
        inprogress_date: inprogress_date,
        done_date: done_date,
        points: task_points,
        is_edit: is_edit,
    }));
    await db_1.db.insert(schema_1.tasks).values(tasksToInsert);
    if (status === 'approve' && pointsToAdd !== 0) {
        for (const userId of final_users_ids) {
            await db_1.db.update(schema_1.users)
                .set({ points: (0, drizzle_orm_1.sql) `points + ${pointsToAdd}` })
                .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        }
    }
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
    const { name, description, project_id, group_id, user_id, users_ids, delivery_date, status, importanc_status, tester_note, documentation, sort, } = validated.body;
    if (req.user?.role === 'engineer' && (status === 'approve' || status === 'edit')) {
        return (0, response_1.SuccessResponse)(res, { message: "You don't have permission to approve or edit tasks" }, 403);
    }
    const [existingTask] = await db_1.db
        .select()
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!existingTask) {
        throw new NotFound_1.NotFound("Task not found");
    }
    if (existingTask.status === 'approve') {
        if (req.user?.role === 'engineer') {
            return (0, response_1.SuccessResponse)(res, { message: "You don't have permission to modify approved tasks" }, 403);
        }
        if (status !== undefined && status !== 'approve' && status !== 'edit') {
            return (0, response_1.SuccessResponse)(res, { message: "Approved tasks can only be changed to edit" }, 403);
        }
    }
    let ProjectDocumentation = existingTask.documentation;
    const shouldDeleteDoc = req.body.delete_documentation === "true" ||
        req.body.delete_documentation === true ||
        documentation === "" ||
        documentation === null ||
        documentation === "null";
    if (req.file) {
        ProjectDocumentation = (0, upload_1.getFileUrl)(req, req.file, "projects");
        if (existingTask.documentation) {
            const [stillUsed] = await db_1.db
                .select({ id: schema_1.tasks.id })
                .from(schema_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, existingTask.documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, existingTask.id)))
                .limit(1);
            if (!stillUsed) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingTask.documentation);
            }
        }
    }
    else if (shouldDeleteDoc) {
        if (existingTask.documentation) {
            const [stillUsed] = await db_1.db
                .select({ id: schema_1.tasks.id })
                .from(schema_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, existingTask.documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, existingTask.id)))
                .limit(1);
            if (!stillUsed) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingTask.documentation);
            }
        }
        ProjectDocumentation = null;
    }
    else if (documentation !== undefined) {
        if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
            const result = await (0, handleImages_1.saveBase64Image)(req, documentation, "projects");
            if (existingTask.documentation) {
                const [stillUsed] = await db_1.db
                    .select({ id: schema_1.tasks.id })
                    .from(schema_1.tasks)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, existingTask.documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, existingTask.id)))
                    .limit(1);
                if (!stillUsed) {
                    await (0, deleteImage_1.deletePhotoFromServer)(existingTask.documentation);
                }
            }
            ProjectDocumentation = result.url;
        }
    }
    const updateData = {};
    if (req.user?.role === 'engineer') {
        if (status !== undefined)
            updateData.status = status;
        if (req.file || shouldDeleteDoc || documentation !== undefined)
            updateData.documentation = ProjectDocumentation;
    }
    else {
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
        if (sort !== undefined && sort !== null)
            updateData.sort = sort;
        if (req.file || shouldDeleteDoc || documentation !== undefined)
            updateData.documentation = ProjectDocumentation;
    }
    if (status !== undefined && status !== existingTask.status) {
        if (status === 'inprogress') {
            if (!existingTask.inprogress_date) {
                updateData.inprogress_date = new Date();
            }
        }
        else if (status === 'done') {
            updateData.done_date = new Date();
        }
        else if (status === 'edit') {
            updateData.is_edit = true;
        }
        else if (status === 'approve') {
            if (!existingTask.done_date) {
                updateData.done_date = new Date();
            }
            const [setting] = await db_1.db.select().from(schema_1.settings).limit(1);
            const task_approve_points = setting?.task_approve_points || 0;
            const task_edit_points = setting?.task_edit_points || 0;
            const task_delay_points = setting?.task_delay_points || 0;
            const isEdit = existingTask.is_edit || false;
            const extraPoints = existingTask.extra_points || 0;
            const getMillis = (d) => {
                if (!d)
                    return new Date().getTime();
                if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
                    return new Date(`${d}T23:59:59`).getTime();
                if (d instanceof Date)
                    return d.getTime();
                return new Date(d).getTime();
            };
            const doneDateMillis = getMillis(updateData.done_date || existingTask.done_date);
            const deliveryDateMillis = getMillis(existingTask.delivery_date);
            let calculated_points = 0;
            if (isEdit) {
                calculated_points = task_edit_points + extraPoints;
            }
            else {
                if (doneDateMillis >= deliveryDateMillis) {
                    calculated_points = task_approve_points + extraPoints;
                }
                else {
                    calculated_points = task_delay_points + extraPoints;
                }
            }
            updateData.points = calculated_points;
            if (existingTask.user_id) {
                await db_1.db.update(schema_1.users)
                    .set({ points: (0, drizzle_orm_1.sql) `points + ${calculated_points}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, existingTask.user_id));
            }
        }
    }
    // 🚀 Multi-User Sync for Edit Task
    if (req.user?.role !== 'engineer' && users_ids !== undefined) {
        const targetUserIds = Array.from(new Set(users_ids));
        // Find existing sibling tasks with same group_id and name
        const siblingTasks = (existingTask.group_id && existingTask.name)
            ? await db_1.db
                .select()
                .from(schema_1.tasks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, existingTask.group_id), (0, drizzle_orm_1.eq)(schema_1.tasks.name, existingTask.name)))
            : [existingTask];
        if (!siblingTasks.some(t => t.id === existingTask.id)) {
            siblingTasks.push(existingTask);
        }
        // Categorize sibling tasks:
        // - keptTasks: tasks whose user_id is in targetUserIds
        // - obsoleteTasks: tasks whose user_id is NOT in targetUserIds
        const keptTasks = [];
        const obsoleteTasks = [];
        const assignedTargetUsers = new Set();
        // Prioritize keeping existingTask if its user is in targetUserIds
        if (existingTask.user_id && targetUserIds.includes(existingTask.user_id)) {
            keptTasks.push(existingTask);
            assignedTargetUsers.add(existingTask.user_id);
        }
        else {
            obsoleteTasks.push(existingTask);
        }
        for (const t of siblingTasks) {
            if (t.id === existingTask.id)
                continue;
            if (t.user_id && targetUserIds.includes(t.user_id) && !assignedTargetUsers.has(t.user_id)) {
                keptTasks.push(t);
                assignedTargetUsers.add(t.user_id);
            }
            else {
                obsoleteTasks.push(t);
            }
        }
        // Target users who still don't have a task row
        const unassignedTargetUsers = targetUserIds.filter(uid => !assignedTargetUsers.has(uid));
        // Reassign obsolete tasks to unassigned target users if available, otherwise delete
        const tasksToReassign = [];
        const tasksToDelete = [];
        for (const obs of obsoleteTasks) {
            if (unassignedTargetUsers.length > 0) {
                const newUid = unassignedTargetUsers.shift();
                tasksToReassign.push({ task: obs, newUserId: newUid });
                assignedTargetUsers.add(newUid);
            }
            else {
                tasksToDelete.push(obs);
            }
        }
        // Delete obsolete tasks that aren't reassigned
        for (const dTask of tasksToDelete) {
            if (dTask.documentation) {
                const [stillUsed] = await db_1.db
                    .select({ id: schema_1.tasks.id })
                    .from(schema_1.tasks)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, dTask.documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, dTask.id)))
                    .limit(1);
                if (!stillUsed) {
                    await (0, deleteImage_1.deletePhotoFromServer)(dTask.documentation);
                }
            }
            await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, dTask.id));
        }
        // Shared updates to apply across all sibling tasks
        const sharedUpdateData = {};
        if (updateData.name !== undefined)
            sharedUpdateData.name = updateData.name;
        if (updateData.description !== undefined)
            sharedUpdateData.description = updateData.description;
        if (updateData.delivery_date !== undefined)
            sharedUpdateData.delivery_date = updateData.delivery_date;
        if (updateData.importanc_status !== undefined)
            sharedUpdateData.importanc_status = updateData.importanc_status;
        if (updateData.tester_note !== undefined)
            sharedUpdateData.tester_note = updateData.tester_note;
        if (updateData.documentation !== undefined)
            sharedUpdateData.documentation = updateData.documentation;
        if (updateData.group_id !== undefined)
            sharedUpdateData.group_id = updateData.group_id;
        if (updateData.project_id !== undefined)
            sharedUpdateData.project_id = updateData.project_id;
        // Apply reassignment updates
        for (const { task: rTask, newUserId } of tasksToReassign) {
            const rData = rTask.id === existingTask.id ? { ...updateData, user_id: newUserId } : { ...sharedUpdateData, user_id: newUserId };
            if (Object.keys(rData).length > 0) {
                await db_1.db.update(schema_1.tasks).set(rData).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, rTask.id));
            }
        }
        // Apply kept updates
        for (const kTask of keptTasks) {
            if (kTask.id === existingTask.id) {
                if (Object.keys(updateData).length > 0) {
                    await db_1.db.update(schema_1.tasks).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, kTask.id));
                }
            }
            else {
                if (Object.keys(sharedUpdateData).length > 0) {
                    await db_1.db.update(schema_1.tasks).set(sharedUpdateData).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, kTask.id));
                }
            }
        }
        // Insert new duplicate tasks for any remaining unassigned target users
        if (unassignedTargetUsers.length > 0) {
            const effectiveName = updateData.name ?? existingTask.name;
            const effectiveDescription = updateData.description ?? existingTask.description;
            const effectiveDeliveryDate = updateData.delivery_date !== undefined ? updateData.delivery_date : existingTask.delivery_date;
            const effectiveImportance = updateData.importanc_status ?? existingTask.importanc_status ?? "medium";
            const effectiveTesterNote = updateData.tester_note ?? existingTask.tester_note;
            const effectiveDocumentation = updateData.documentation !== undefined ? updateData.documentation : existingTask.documentation;
            const effectiveStatus = updateData.status ?? "pending";
            const effectiveGroupId = updateData.group_id ?? existingTask.group_id;
            const effectiveProjectId = updateData.project_id ?? existingTask.project_id;
            const newTasksToInsert = unassignedTargetUsers.map(newUid => ({
                id: (0, uuid_1.v4)(),
                name: effectiveName,
                description: effectiveDescription,
                project_id: effectiveProjectId,
                group_id: effectiveGroupId,
                user_id: newUid,
                delivery_date: effectiveDeliveryDate,
                status: effectiveStatus,
                importanc_status: effectiveImportance,
                tester_note: effectiveTesterNote,
                documentation: effectiveDocumentation,
                points: 0,
                is_edit: false,
            }));
            await db_1.db.insert(schema_1.tasks).values(newTasksToInsert);
        }
        return (0, response_1.SuccessResponse)(res, { message: "Task updated successfully" }, 200);
    }
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
        const [stillUsed] = await db_1.db
            .select({ id: schema_1.tasks.id })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, existingTask[0].documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, id)))
            .limit(1);
        if (!stillUsed) {
            await (0, deleteImage_1.deletePhotoFromServer)(existingTask[0].documentation);
        }
    }
    await db_1.db.delete(schema_1.tasks).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
    (0, response_1.SuccessResponse)(res, { message: "Task deleted successfully" }, 200);
};
exports.deleteTasks = deleteTasks;
// ✅ Delete Task Documentation
const deleteTaskDocumentation = async (req, res) => {
    const validated = await exports.TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const [task] = await db_1.db
        .select()
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!task) {
        throw new NotFound_1.NotFound("Task not found");
    }
    if (task.documentation) {
        const [stillUsed] = await db_1.db
            .select({ id: schema_1.tasks.id })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.documentation, task.documentation), (0, drizzle_orm_1.ne)(schema_1.tasks.id, id)))
            .limit(1);
        if (!stillUsed) {
            // 1. Delete from server disk first
            await (0, deleteImage_1.deletePhotoFromServer)(task.documentation);
        }
        // 2. Delete from database
        if (task.group_id && task.name) {
            await db_1.db
                .update(schema_1.tasks)
                .set({ documentation: null })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, task.group_id), (0, drizzle_orm_1.eq)(schema_1.tasks.name, task.name)));
        }
        else {
            await db_1.db.update(schema_1.tasks).set({ documentation: null }).where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id));
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Task documentation deleted successfully" }, 200);
};
exports.deleteTaskDocumentation = deleteTaskDocumentation;
// ✅ Add Voice Note to Task (Admin or Team Leader)
const addTaskVoice = async (req, res) => {
    const { id } = req.params;
    const role = req.user?.role;
    if (role !== "admin" && role !== "super_admin" && role !== "tester") {
        return res.status(403).json({ success: false, message: "Only Admin or Team Leader can add voice notes" });
    }
    const [existingTask] = await db_1.db
        .select({ id: schema_1.tasks.id })
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    if (!existingTask) {
        throw new NotFound_1.NotFound("Task not found");
    }
    let voiceUrl = null;
    if (req.file) {
        voiceUrl = (0, upload_1.getFileUrl)(req, req.file, "voices");
    }
    else if (req.body.voice && typeof req.body.voice === "string" && req.body.voice.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, req.body.voice, "voices");
        voiceUrl = result.url;
    }
    if (!voiceUrl) {
        return res.status(400).json({ success: false, message: "Voice audio file or data is required" });
    }
    const duration = req.body.duration ? parseInt(req.body.duration, 10) : 0;
    const voiceId = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.taskVoices).values({
        id: voiceId,
        task_id: id,
        user_id: req.user?.id || null,
        voice_url: voiceUrl,
        duration: isNaN(duration) ? 0 : duration,
    });
    const [savedVoice] = await db_1.db
        .select({
        id: schema_1.taskVoices.id,
        voice_url: schema_1.taskVoices.voice_url,
        duration: schema_1.taskVoices.duration,
        createdAt: schema_1.taskVoices.createdAt,
        user_id: schema_1.users.id,
        user_name: schema_1.users.name,
        user_image: schema_1.users.image,
        user_role: schema_1.users.role,
    })
        .from(schema_1.taskVoices)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.taskVoices.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.taskVoices.id, voiceId))
        .limit(1);
    (0, response_1.SuccessResponse)(res, { message: "Voice note added successfully", voice: savedVoice }, 201);
};
exports.addTaskVoice = addTaskVoice;
// ✅ Delete Task Voice Note
const deleteTaskVoice = async (req, res) => {
    const { id, voiceId } = req.params;
    const role = req.user?.role;
    const userId = req.user?.id;
    const [voice] = await db_1.db
        .select()
        .from(schema_1.taskVoices)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taskVoices.id, voiceId), (0, drizzle_orm_1.eq)(schema_1.taskVoices.task_id, id)))
        .limit(1);
    if (!voice) {
        throw new NotFound_1.NotFound("Voice note not found");
    }
    if (role !== "admin" && role !== "super_admin" && voice.user_id !== userId) {
        return res.status(403).json({ success: false, message: "You don't have permission to delete this voice note" });
    }
    // 1. Delete from server disk first
    if (voice.voice_url) {
        await (0, deleteImage_1.deletePhotoFromServer)(voice.voice_url);
    }
    // 2. Delete from database
    await db_1.db.delete(schema_1.taskVoices).where((0, drizzle_orm_1.eq)(schema_1.taskVoices.id, voiceId));
    (0, response_1.SuccessResponse)(res, { message: "Voice note deleted successfully" }, 200);
};
exports.deleteTaskVoice = deleteTaskVoice;
// ✅ Get Voices for Task
const getTaskVoices = async (req, res) => {
    const { id } = req.params;
    const [task] = await db_1.db
        .select({ id: schema_1.tasks.id, group_id: schema_1.tasks.group_id, name: schema_1.tasks.name })
        .from(schema_1.tasks)
        .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, id))
        .limit(1);
    let siblingTaskIds = [id];
    if (task && task.group_id && task.name) {
        const siblings = await db_1.db
            .select({ id: schema_1.tasks.id })
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.group_id, task.group_id), (0, drizzle_orm_1.eq)(schema_1.tasks.name, task.name)));
        siblingTaskIds = siblings.map(s => s.id);
    }
    if (!siblingTaskIds.includes(id)) {
        siblingTaskIds.push(id);
    }
    const voices = await db_1.db
        .select({
        id: schema_1.taskVoices.id,
        voice_url: schema_1.taskVoices.voice_url,
        duration: schema_1.taskVoices.duration,
        createdAt: schema_1.taskVoices.createdAt,
        user_id: schema_1.users.id,
        user_name: schema_1.users.name,
        user_image: schema_1.users.image,
        user_role: schema_1.users.role,
    })
        .from(schema_1.taskVoices)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.taskVoices.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.inArray)(schema_1.taskVoices.task_id, siblingTaskIds))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.taskVoices.createdAt));
    const safeVoices = Array.isArray(voices) ? voices.filter(v => Boolean(v && v.id)) : [];
    (0, response_1.SuccessResponse)(res, { voices: safeVoices }, 200);
};
exports.getTaskVoices = getTaskVoices;
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
            (0, drizzle_orm_1.lt)(schema_1.tasks.delivery_date, (0, drizzle_orm_1.sql) `CURRENT_DATE()`),
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
        if (req.user?.role === 'tester' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, req.user.id));
        }
        if (req.user?.role === 'engineer' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, req.user.id));
        }
        // دمج جميع الشروط
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        // 2. تطبيق الشروط على الاستعلام الرئيسي
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
            .orderBy((0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.importanc_status} = 'urgent' AND ${schema_1.tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`, (0, drizzle_orm_1.desc)(schema_1.tasks.delivery_date), (0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
            .$dynamic();
        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db_1.db
            .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
            .from(schema_1.tasks)
            .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
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
        if (req.user?.role === 'tester' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, req.user.id));
        }
        if (req.user?.role === 'engineer' && req.user?.id) {
            whereConditions.push((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, req.user.id));
        }
        // دمج جميع الشروط
        const combinedCondition = (0, drizzle_orm_1.and)(...whereConditions);
        // 2. تطبيق الشروط على الاستعلام الرئيسي
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
            .orderBy((0, drizzle_orm_1.sql) `CASE WHEN ${schema_1.tasks.importanc_status} = 'urgent' AND ${schema_1.tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`, (0, drizzle_orm_1.desc)(schema_1.tasks.delivery_date), (0, drizzle_orm_1.desc)(schema_1.tasks.createdAt))
            .$dynamic();
        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db_1.db
            .select({ total: (0, drizzle_orm_1.count)(schema_1.tasks.id) })
            .from(schema_1.tasks)
            .leftJoin(schema_1.projects, (0, drizzle_orm_1.eq)(schema_1.tasks.project_id, schema_1.projects.id))
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
// ✅ Reorder Tasks
const reorderTasks = async (req, res) => {
    const { tasks: items, taskIds } = req.body;
    let updates = [];
    if (Array.isArray(items) && items.length > 0) {
        updates = items
            .filter((item) => item && item.id && item.sort !== undefined && item.sort !== null)
            .map((item) => ({ id: String(item.id), sort: Number(item.sort) }));
    }
    else if (Array.isArray(taskIds) && taskIds.length > 0) {
        updates = taskIds
            .filter((id) => typeof id === 'string' && id.trim())
            .map((id, index) => ({ id: id.trim(), sort: index + 1 }));
    }
    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No tasks provided for reordering",
        });
    }
    await db_1.db.transaction(async (tx) => {
        for (const update of updates) {
            await tx
                .update(schema_1.tasks)
                .set({ sort: update.sort })
                .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, update.id));
        }
    });
    return (0, response_1.SuccessResponse)(res, { message: "Tasks reordered successfully" }, 200);
};
exports.reorderTasks = reorderTasks;
