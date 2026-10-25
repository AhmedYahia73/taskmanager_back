// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, projectGroups, tasks, users, settings, taskVoices, notifications } from "../../models/schema"; 
import { SQL, and, or, eq, like, count, desc, asc, sql, lte, lt, ne, inArray } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { saveBase64Image } from "../../utils/handleImages";
import { getFileUrl, parseArray } from "../../middlewares/upload";
import { sendNotificationToAdmins } from "../../socket";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const dateInputSchema = z.preprocess((val) => {
  if (!val || val === '' || val === 'null' || val === 'undefined') return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  return val;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)").nullable().optional());

export const createTasksSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: "Name is required" })
      .trim()
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters"),

    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .nullable()
      .optional(),

    documentation: z.any() 
      .nullable()
      .optional(),
    tester_note: z
      .string()
      .trim()
      .max(1000, "Tester Note cannot exceed 1000 characters")
      .nullable()
      .optional(),

    delivery_date: dateInputSchema,

    project_id: z
      .string({ required_error: "Project ID is required" })
      .uuid("Invalid project ID format"),

    group_id: z
      .string({ required_error: "Group ID is required" })
      .uuid("Invalid group ID format"),

    status: z.enum(["pending", "inprogress", "done", "edit", "approve"], {
      required_error: "Status is required",
      invalid_type_error:
        "Status must be either 'pending', 'inprogress', 'done', 'edit', 'approve'",
    }),

    importanc_status: z.enum(["low", "medium", "high", "urgent"], {
      invalid_type_error: "Importance must be 'low', 'medium', 'high', or 'urgent'"
    }).optional(),

    sort: z.preprocess((val) => {
      if (val === undefined || val === null || val === '') return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    }, z.number().int().optional().nullable()),

    users_ids: z.preprocess(
      parseArray,
      z.array(
        z.string().uuid("Invalid User ID format inside users_ids"),
        { required_error: "Users IDs array is required" }
      ).min(1, "At least one user ID is required")
    ),
  }),
});

export const updateTasksSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: "Task ID is required" })
      .uuid("Invalid Task ID format"),
  }),

  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(1, "Name cannot be empty")
        .max(200, "Name cannot exceed 200 characters")
        .optional(),

    documentation: z.any() 
      .nullable()
      .optional(),
      description: z
        .string()
        .trim()
        .max(1000, "Description cannot exceed 1000 characters")
        .nullable()
        .optional(),

      tester_note: z
        .string()
        .trim()
        .max(1000, "Tester Note cannot exceed 1000 characters")
        .nullable()
        .optional(),

      delivery_date: dateInputSchema,

      project_id: z
        .string()
        .uuid("Invalid project ID format")
        .optional(),

      group_id: z
        .string()
        .uuid("Invalid group ID format")
        .optional(),

      user_id: z
        .string()
        .uuid("Invalid user ID format")
        .optional(),

      users_ids: z.preprocess(
        parseArray,
        z.array(
          z.string().uuid("Invalid User ID format inside users_ids")
        ).min(1, "At least one user ID is required")
      ).optional(),

      status: z
        .enum(["pending", "inprogress", "done", "edit", "approve"], {
          invalid_type_error:
            "Status must be either 'pending', 'inprogress', 'done', 'edit', 'approve'",
        })
        .optional(),

      importanc_status: z
        .enum(["low", "medium", "high", "urgent"], {
          invalid_type_error: "Importance must be 'low', 'medium', 'high', or 'urgent'"
        })
        .optional(),

      sort: z.preprocess((val) => {
        if (val === undefined || val === null || val === '') return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
      }, z.number().int().optional().nullable()),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

// Schema للعمليات التي تتطلب Task ID
export const TaskIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Task ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Tasks
export const getAllTasks = async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const group_id = (req.query.group_id as string)?.trim() || '';
    const project_id = (req.query.project_id as string)?.trim() || '';
    const user_id = (req.query.user_id as string)?.trim() || '';
    
    const offset = (page - 1) * limit;
    const whereConditions: SQL[] = [];

    if (search) {
        whereConditions.push(like(tasks.name, `%${search}%`));
    }

    const status = (req.query.status as string)?.trim() || '';
    if (status) {
        whereConditions.push(eq(tasks.status, status as any));
    }

    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (group_id && group_id !== 'undefined' && group_id !== 'null') {
        whereConditions.push(eq(tasks.group_id, group_id));
    }
    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (project_id && project_id !== 'undefined' && project_id !== 'null') {
        whereConditions.push(eq(tasks.project_id, project_id));
    }
    // 1. التصفية حسب مستخدم معین (إذا وجد)
    if (user_id && user_id !== 'undefined' && user_id !== 'null') {
        whereConditions.push(eq(tasks.user_id, user_id));
    }
    
    const userRole = req.user?.role as string | undefined;
    const isGlobalAdmin = userRole === 'admin' || userRole === 'super_admin';
    const currentUserId = req.user?.id;

    if (!isGlobalAdmin && currentUserId) {
        whereConditions.push(
            or(
                eq(projects.tester_id, currentUserId),
                eq(tasks.user_id, currentUserId)
            )!
        );
    }

    const hasGroupId = group_id && group_id !== 'undefined' && group_id !== 'null';

    const orderCriteria = hasGroupId 
      ? [
          sql`CASE WHEN ${tasks.sort} IS NOT NULL AND ${tasks.sort} > 0 THEN 0 ELSE 1 END ASC`,
          asc(tasks.sort),
          desc(tasks.createdAt)
        ]
      : [
          sql`CASE WHEN ${tasks.sort} IS NOT NULL AND ${tasks.sort} > 0 THEN 0 ELSE 1 END ASC`,
          asc(tasks.sort),
          sql`CASE WHEN ${tasks.importanc_status} = 'urgent' AND ${tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`,
          desc(tasks.delivery_date),
          desc(tasks.createdAt)
        ];

    let query = db
        .select({
            id: tasks.id,
            name: tasks.name,
            description: tasks.description,
            documentation: tasks.documentation,
            status: tasks.status,
            importanc_status: tasks.importanc_status,
            delivery_date: tasks.delivery_date,
            tester_note: tasks.tester_note,
            sort: tasks.sort,
            createdAt: tasks.createdAt,
            user_name: users.name,
            user_phone: users.phone,
            user_id: tasks.user_id,
            user_image: users.image,
            project_group: projectGroups.name,
            project_name: projects.name,
            project_id: tasks.project_id,
            tester_id: projects.tester_id,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.project_id, projects.id))
        .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
        .leftJoin(users, eq(tasks.user_id, users.id))
        .orderBy(...orderCriteria)
        .$dynamic();

    let countQuery = db
        .select({ total: count(tasks.id) })
        .from(tasks)
        .leftJoin(projects, eq(tasks.project_id, projects.id))
        .$dynamic();

    if (whereConditions.length > 0) {
        const combinedCondition = and(...whereConditions);
        query = query.where(combinedCondition);
        countQuery = countQuery.where(combinedCondition);
    }

    const [allTasks, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    const mappedTasks = allTasks.map(task => {
        let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
        if (isGlobalAdmin) {
            user_role = 'admin';
        } else if (task.tester_id === currentUserId) {
            user_role = 'leader';
        } else {
            user_role = 'engineer';
        }
        return {
            ...task,
            user_role
        };
    });

    SuccessResponse(res, { 
        tasks: mappedTasks,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit)
        }
    }, 200);
};

export const todayTasks = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const project_id = (req.query.project_id as string)?.trim() || '';
        const user_id = (req.query.user_id as string)?.trim() || '';
        
        const offset = (page - 1) * limit;
        
        const whereConditions: SQL[] = [
            eq(tasks.delivery_date, sql`CURRENT_DATE()`),
            ne(tasks.status, "approve")
        ];

        if (search) {
            whereConditions.push(like(tasks.name, `%${search}%`));
        }  
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push(eq(tasks.project_id, project_id));
        }
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push(eq(tasks.user_id, user_id));
        }
        
        const userRole = req.user?.role as string | undefined;
        const isGlobalAdmin = userRole === 'admin' || userRole === 'super_admin';
        const currentUserId = req.user?.id;

        if (!isGlobalAdmin && currentUserId) {
            whereConditions.push(
                or(
                    eq(projects.tester_id, currentUserId),
                    eq(tasks.user_id, currentUserId)
                )!
            );
        }

        const combinedCondition = and(...whereConditions);

        let query = db
            .select({
                id: tasks.id,
                name: tasks.name,
                description: tasks.description,
                documentation: tasks.documentation,
                status: tasks.status,
                importanc_status: tasks.importanc_status,
                delivery_date: tasks.delivery_date,
                tester_note: tasks.tester_note,
                user_name: users.name,
                user_image: users.image,
                user_phone: users.phone,
                user_id: tasks.user_id,
                project_group: projectGroups.name,
                project_name: projects.name,
                project_id: tasks.project_id,
                tester_id: projects.tester_id,
            })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
            .leftJoin(users, eq(tasks.user_id, users.id))
            .where(combinedCondition) 
            .orderBy(
                sql`CASE WHEN ${tasks.importanc_status} = 'urgent' AND ${tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`,
                desc(tasks.delivery_date),
                desc(tasks.createdAt)
            )
            .$dynamic();

        let countQuery = db
            .select({ total: count(tasks.id) })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .where(combinedCondition) 
            .$dynamic();

        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);

        const mappedTasks = allTasks.map(task => {
            let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
            if (isGlobalAdmin) {
                user_role = 'admin';
            } else if (task.tester_id === currentUserId) {
                user_role = 'leader';
            } else {
                user_role = 'engineer';
            }
            return {
                ...task,
                user_role
            };
        });

        SuccessResponse(res, { 
            tasks: mappedTasks,
            pagination: {
                total: Number(totalCount),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount) / limit)
            }
        }, 200);

    } catch (error) {
        res.status(500).json({ success: false, message: "Server Error", error });
    }
};

// ✅ Get Options / Dropdown Lists (Projects, Groups, Engineers)
export const lists = async (req: Request, res: Response) => {
    const projects_list = await db
        .select({
            id: projects.id,
            name: projects.name,
        })
        .from(projects);

    const groups_list = await db
        .select({
            id: projectGroups.id,
            name: projectGroups.name,
        })
        .from(projectGroups);

    const users_list = await db
        .select({
            id: users.id,
            name: users.name,
        })
        .from(users)
        .where(eq(users.role, "engineer")); // إصلاح: إضافة التنصيص للنص

    SuccessResponse(res, { projects_list, groups_list, users_list }, 200);
};

// ✅ Get Task By ID
export const getTaskById = async (req: Request, res: Response) => {
    const validated = await TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const taskResult = await db
        .select({
            id: tasks.id,
            name: tasks.name,
            description: tasks.description,
            status: tasks.status,
            importanc_status: tasks.importanc_status,
            delivery_date: tasks.delivery_date,
            tester_note: tasks.tester_note,
            project_name: projects.name,
            project_id: projects.id,
            tester_id: projects.tester_id,
            group_name: projectGroups.name,
            group_id: projectGroups.id,
            user_name: users.name,
            documentation: tasks.documentation,
            user_id: users.id,
            sort: tasks.sort,
            createdAt: tasks.createdAt,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.project_id, projects.id))
        .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
        .leftJoin(users, eq(tasks.user_id, users.id))
        .where(eq(tasks.id, id))
        .limit(1);
  
    if (!taskResult[0]) {
        throw new NotFound("Task not found");
    }

    const task = taskResult[0];
    const currentUserId = req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
    if (isGlobalAdmin) {
        user_role = 'admin';
    } else if (task.tester_id === currentUserId) {
        user_role = 'leader';
    } else {
        user_role = 'engineer';
    }

    let siblingTaskIds: string[] = [id];
    let users_ids: string[] = [];
    if (task.group_id && task.name) {
        const siblings = await db
            .select({ id: tasks.id, user_id: tasks.user_id })
            .from(tasks)
            .where(and(
                eq(tasks.group_id, task.group_id),
                eq(tasks.name, task.name)
            ));
        siblingTaskIds = siblings.map(s => s.id);
        users_ids = siblings
            .map(s => s.user_id)
            .filter((uid): uid is string => Boolean(uid));
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
    let assigned_users: { id: string; name: string; image: string | null; role: string }[] = [];
    if (users_ids.length > 0) {
        assigned_users = await db
            .select({
                id: users.id,
                name: users.name,
                image: users.image,
                role: users.role,
            })
            .from(users)
            .where(inArray(users.id, users_ids));
    }

    // Fetch voices for this task (including any sibling tasks with same group_id and name)
    let voices: any[] = [];
    try {
        voices = await db
            .select({
                id: taskVoices.id,
                voice_url: taskVoices.voice_url,
                duration: taskVoices.duration,
                createdAt: taskVoices.createdAt,
                user_id: users.id,
                user_name: users.name,
                user_image: users.image,
                user_role: users.role,
            })
            .from(taskVoices)
            .leftJoin(users, eq(taskVoices.user_id, users.id))
            .where(inArray(taskVoices.task_id, siblingTaskIds))
            .orderBy(desc(taskVoices.createdAt));
    } catch (err) {
        console.warn("Voices table might not exist yet:", err);
    }

    const safeVoices = Array.isArray(voices) ? voices.filter(v => Boolean(v && v.id)).map(v => ({
        ...v,
        user_role: v.user_id === task.tester_id ? 'tester' : (v.user_role || 'engineer')
    })) : [];
    const safeAssignedUsers = Array.isArray(assigned_users) ? assigned_users.filter(u => Boolean(u && u.id)) : [];

    SuccessResponse(res, { task: { ...task, user_role, users_ids, assigned_users: safeAssignedUsers, voices: safeVoices } }, 200);
};

// ✅ Create Tasks (Multi-User Duplicate)
export const createTasks = async (req: Request, res: Response) => {
    const validated = await createTasksSchema.parseAsync({ body: req.body });
    let { 
        name, 
        description, 
        project_id, 
        group_id, 
        delivery_date, 
        status, 
        importanc_status,
        tester_note, 
        users_ids,
        documentation,
        sort,
    } = validated.body;

    const [project] = await db.select({ tester_id: projects.tester_id }).from(projects).where(eq(projects.id, project_id)).limit(1);
    const isLeader = project?.tester_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isLeaderOrAdmin = isAdmin || isLeader;

    let final_users_ids = users_ids;
    if (!isLeaderOrAdmin && req.user?.id) {
        final_users_ids = [req.user.id];
        tester_note = undefined; // Engineers cannot set tester_note on creation
    } else {
        final_users_ids = Array.from(new Set(final_users_ids));
    }

    let savedProjectDocumentation: string | null = null; 

    if (req.file) {
        savedProjectDocumentation = getFileUrl(req, req.file, "projects");
    } else if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
        const result = await saveBase64Image(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    } else if (typeof documentation === "string" && documentation && documentation !== "null" && documentation !== "undefined") {
        savedProjectDocumentation = documentation;
    }
    let inprogress_date: Date | null = null;
    let done_date: Date | null = null;
    let task_points = 0;
    let pointsToAdd = 0;
    let is_edit = false;

    if (status === 'inprogress') {
        inprogress_date = new Date();
    } else if (status === 'done') {
        done_date = new Date();
    } else if (status === 'edit') {
        is_edit = true;
    } else if (status === 'approve') {
        const [setting] = await db.select().from(settings).limit(1);
        const task_approve_points = setting?.task_approve_points || 0;
        const task_delay_points = setting?.task_delay_points || 0;
        
        const doneDateMillis = new Date().getTime();
        const deliveryDateMillis = delivery_date ? (typeof delivery_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(delivery_date) ? new Date(`${delivery_date}T23:59:59`).getTime() : new Date(delivery_date).getTime()) : new Date().getTime();

        if (doneDateMillis >= deliveryDateMillis) {
            pointsToAdd = task_approve_points;
        } else {
            pointsToAdd = task_delay_points;
        }
        
        task_points = pointsToAdd;
    }

    let task_sort = sort;
    if (task_sort === undefined || task_sort === null) {
        const [maxSortResult] = await db
            .select({ maxSort: sql<number>`MAX(${tasks.sort})` })
            .from(tasks)
            .where(eq(tasks.group_id, group_id));
        const maxSort = maxSortResult?.maxSort ?? 0;
        task_sort = maxSort > 0 ? maxSort + 1 : 0;
    }

    const tasksToInsert = final_users_ids.map((userId) => ({
        id: uuidv4(),
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

    await db.insert(tasks).values(tasksToInsert);

    if (status === 'approve' && pointsToAdd !== 0) {
        for (const userId of final_users_ids) {
            await db.update(users)
                .set({ points: sql`points + ${pointsToAdd}` })
                .where(eq(users.id, userId));
        }
    }

    return SuccessResponse(
        res, 
        { message: `${tasksToInsert.length} tasks created successfully` }, 
        201
    );
};

// 🔔 Helper to notify admins when a task status changes by a non-admin (leader, sales_leader, engineer)
const notifyAdminOnTaskStatusChange = async (
    reqUser: any,
    existingTask: any,
    newStatus: string
) => {
    try {
        const updaterRole = reqUser?.role || "";
        const isLeaderRole = updaterRole === "leader" || updaterRole === "leader_sales" || updaterRole === "sales_leader";
        const isEngineer = updaterRole === "engineer";
        const isNonAdmin = updaterRole !== "admin" && updaterRole !== "super_admin";

        // Only notify if status was changed by a leader, sales_leader, engineer or non-admin
        if (!isLeaderRole && !isEngineer && !isNonAdmin) {
            return;
        }

        const updaterName = reqUser?.name || "User";
        const taskName = existingTask.name || "Task";
        const oldStatus = existingTask.status || "unknown";

        let assignedUserName = "Unassigned";
        if (existingTask.user_id) {
            const [assignedUser] = await db
                .select({ name: users.name })
                .from(users)
                .where(eq(users.id, existingTask.user_id))
                .limit(1);
            if (assignedUser?.name) {
                assignedUserName = assignedUser.name;
            }
        }

        // Format required by user in English:
        // قام user.name بتغيير حالة task.name بتاعة اليوزر tasks.user.name من tasks.status الى req.body.status
        const description = `${updaterName} changed the status of task "${taskName}" for user "${assignedUserName}" from "${oldStatus}" to "${newStatus}"`.slice(0, 500);

        // Fetch all admins and super_admins
        const adminUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(or(eq(users.role, "admin"), eq(users.role, "super_admin")));

        if (adminUsers.length > 0) {
            const records = adminUsers.map((adm) => ({
                user_id: adm.id,
                target: "admin",
                type: "task_status",
                link: "/admin/tasks",
                description,
                is_read: false,
            }));
            await db.insert(notifications).values(records);
        }

        sendNotificationToAdmins({
            target: "admin",
            type: "task_status",
            link: "/admin/tasks",
            description,
            task_id: existingTask.id,
            updater_name: updaterName,
            task_name: taskName,
            assigned_user: assignedUserName,
            old_status: oldStatus,
            new_status: newStatus,
            created_at: new Date().toISOString(),
        });
    } catch (err) {
        console.error("Failed to notify admins on task status change:", err);
    }
};

// ✅ Update Task by ID
export const updateTasks = async (req: Request, res: Response) => {
    const validated = await updateTasksSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });

    const { id } = validated.params;
    const { 
        name, 
        description, 
        project_id, 
        group_id, 
        user_id, 
        users_ids,
        delivery_date, 
        status, 
        importanc_status,
        tester_note,
        documentation,
        sort,
    } = validated.body;
  
    const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!existingTask) {
        throw new NotFound("Task not found");
    } 

    const [project] = existingTask.project_id
        ? await db
            .select({ tester_id: projects.tester_id })
            .from(projects)
            .where(eq(projects.id, existingTask.project_id))
            .limit(1)
        : [];

    const isLeader = project?.tester_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isLeaderOrAdmin = isAdmin || isLeader;

    if (!isLeaderOrAdmin && (status === 'approve' || status === 'edit')) {
        return SuccessResponse(res, { message: "You don't have permission to approve or edit tasks" }, 403);
    }

    if (existingTask.status === 'approve') {
        if (!isLeaderOrAdmin) {
            return SuccessResponse(res, { message: "You don't have permission to modify approved tasks" }, 403);
        }
        if (status !== undefined && status !== 'approve' && status !== 'edit') {
            return SuccessResponse(res, { message: "Approved tasks can only be changed to edit" }, 403);
        }
    }

    let ProjectDocumentation = existingTask.documentation;
    const shouldDeleteDoc = (req.body as any).delete_documentation === "true" || 
                            (req.body as any).delete_documentation === true || 
                            documentation === "" || 
                            documentation === null || 
                            documentation === "null";

    if (req.file) {
        ProjectDocumentation = getFileUrl(req, req.file, "projects");
        if (existingTask.documentation) {
            const [stillUsed] = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(and(
                    eq(tasks.documentation, existingTask.documentation),
                    ne(tasks.id, existingTask.id)
                ))
                .limit(1);
            if (!stillUsed) {
                await deletePhotoFromServer(existingTask.documentation);
            }
        }
    } else if (shouldDeleteDoc) {
        if (existingTask.documentation) {
            const [stillUsed] = await db
                .select({ id: tasks.id })
                .from(tasks)
                .where(and(
                    eq(tasks.documentation, existingTask.documentation),
                    ne(tasks.id, existingTask.id)
                ))
                .limit(1);
            if (!stillUsed) {
                await deletePhotoFromServer(existingTask.documentation);
            }
        }
        ProjectDocumentation = null;
    } else if (documentation !== undefined) {
        if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
            const result = await saveBase64Image(req, documentation, "projects");
            if (existingTask.documentation) {
                const [stillUsed] = await db
                    .select({ id: tasks.id })
                    .from(tasks)
                    .where(and(
                        eq(tasks.documentation, existingTask.documentation),
                        ne(tasks.id, existingTask.id)
                    ))
                    .limit(1);
                if (!stillUsed) {
                    await deletePhotoFromServer(existingTask.documentation);
                }
            }
            ProjectDocumentation = result.url;
        }
    }

    const updateData: Record<string, any> = {};

    if (!isLeaderOrAdmin) {
        if (status !== undefined) updateData.status = status;
        if (req.file || shouldDeleteDoc || documentation !== undefined) updateData.documentation = ProjectDocumentation;
    } else {
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (project_id !== undefined) updateData.project_id = project_id;
        if (group_id !== undefined) updateData.group_id = group_id;
        if (user_id !== undefined) updateData.user_id = user_id;
        if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
        if (status !== undefined) updateData.status = status;
        if (importanc_status !== undefined) updateData.importanc_status = importanc_status;
        if (tester_note !== undefined) updateData.tester_note = tester_note;
        if (sort !== undefined && sort !== null) updateData.sort = sort;
        if (req.file || shouldDeleteDoc || documentation !== undefined) updateData.documentation = ProjectDocumentation;
    }

    if (status !== undefined && status !== existingTask.status) {
        if (status === 'inprogress') {
            if (!existingTask.inprogress_date) {
                updateData.inprogress_date = new Date();
            }
        } else if (status === 'done') {
            updateData.done_date = new Date();
        } else if (status === 'edit') {
            updateData.is_edit = true;
        } else if (status === 'approve') {
            if (!existingTask.done_date) {
                updateData.done_date = new Date();
            }
            const [setting] = await db.select().from(settings).limit(1);
            const task_approve_points = setting?.task_approve_points || 0;
            const task_edit_points = setting?.task_edit_points || 0;
            const task_delay_points = setting?.task_delay_points || 0;
            
            const isEdit = existingTask.is_edit || false;
            const extraPoints = existingTask.extra_points || 0;
            
            const getMillis = (d: any) => {
                if (!d) return new Date().getTime();
                if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T23:59:59`).getTime();
                if (d instanceof Date) return d.getTime();
                return new Date(d).getTime();
            };
            
            const doneDateMillis = getMillis(updateData.done_date || existingTask.done_date);
            const deliveryDateMillis = getMillis(existingTask.delivery_date);

            let calculated_points = 0;
            
            if (isEdit) {
                calculated_points = task_edit_points + extraPoints;
            } else {
                if (doneDateMillis >= deliveryDateMillis) {
                    calculated_points = task_approve_points + extraPoints;
                } else {
                    calculated_points = task_delay_points + extraPoints;
                }
            }
            
            updateData.points = calculated_points;
            
            if (existingTask.user_id) {
                await db.update(users)
                    .set({ points: sql`points + ${calculated_points}` })
                    .where(eq(users.id, existingTask.user_id));
            }
        }
    }

    // 🚀 Multi-User Sync for Edit Task
    if (isLeaderOrAdmin && users_ids !== undefined) {
        const targetUserIds = Array.from(new Set(users_ids));

        // Find existing sibling tasks with same group_id and name
        const siblingTasks = (existingTask.group_id && existingTask.name)
            ? await db
                .select()
                .from(tasks)
                .where(and(
                    eq(tasks.group_id, existingTask.group_id),
                    eq(tasks.name, existingTask.name)
                ))
            : [existingTask];

        if (!siblingTasks.some(t => t.id === existingTask.id)) {
            siblingTasks.push(existingTask);
        }

        // Categorize sibling tasks:
        // - keptTasks: tasks whose user_id is in targetUserIds
        // - obsoleteTasks: tasks whose user_id is NOT in targetUserIds
        const keptTasks: typeof existingTask[] = [];
        const obsoleteTasks: typeof existingTask[] = [];
        const assignedTargetUsers = new Set<string>();

        // Prioritize keeping existingTask if its user is in targetUserIds
        if (existingTask.user_id && targetUserIds.includes(existingTask.user_id)) {
            keptTasks.push(existingTask);
            assignedTargetUsers.add(existingTask.user_id);
        } else {
            obsoleteTasks.push(existingTask);
        }

        for (const t of siblingTasks) {
            if (t.id === existingTask.id) continue;

            if (t.user_id && targetUserIds.includes(t.user_id) && !assignedTargetUsers.has(t.user_id)) {
                keptTasks.push(t);
                assignedTargetUsers.add(t.user_id);
            } else {
                obsoleteTasks.push(t);
            }
        }

        // Target users who still don't have a task row
        const unassignedTargetUsers = targetUserIds.filter(uid => !assignedTargetUsers.has(uid));

        // Reassign obsolete tasks to unassigned target users if available, otherwise delete
        const tasksToReassign: { task: typeof existingTask; newUserId: string }[] = [];
        const tasksToDelete: typeof existingTask[] = [];

        for (const obs of obsoleteTasks) {
            if (unassignedTargetUsers.length > 0) {
                const newUid = unassignedTargetUsers.shift()!;
                tasksToReassign.push({ task: obs, newUserId: newUid });
                assignedTargetUsers.add(newUid);
            } else {
                tasksToDelete.push(obs);
            }
        }

        // Delete obsolete tasks that aren't reassigned
        for (const dTask of tasksToDelete) {
            if (dTask.documentation) {
                const [stillUsed] = await db
                    .select({ id: tasks.id })
                    .from(tasks)
                    .where(and(
                        eq(tasks.documentation, dTask.documentation),
                        ne(tasks.id, dTask.id)
                    ))
                    .limit(1);
                if (!stillUsed) {
                    await deletePhotoFromServer(dTask.documentation);
                }
            }
            await db.delete(tasks).where(eq(tasks.id, dTask.id));
        }

        // Shared updates to apply across all sibling tasks
        const sharedUpdateData: Record<string, any> = {};
        if (updateData.name !== undefined) sharedUpdateData.name = updateData.name;
        if (updateData.description !== undefined) sharedUpdateData.description = updateData.description;
        if (updateData.delivery_date !== undefined) sharedUpdateData.delivery_date = updateData.delivery_date;
        if (updateData.importanc_status !== undefined) sharedUpdateData.importanc_status = updateData.importanc_status;
        if (updateData.tester_note !== undefined) sharedUpdateData.tester_note = updateData.tester_note;
        if (updateData.documentation !== undefined) sharedUpdateData.documentation = updateData.documentation;
        if (updateData.group_id !== undefined) sharedUpdateData.group_id = updateData.group_id;
        if (updateData.project_id !== undefined) sharedUpdateData.project_id = updateData.project_id;

        // Apply reassignment updates
        for (const { task: rTask, newUserId } of tasksToReassign) {
            const rData = rTask.id === existingTask.id ? { ...updateData, user_id: newUserId } : { ...sharedUpdateData, user_id: newUserId };
            if (Object.keys(rData).length > 0) {
                await db.update(tasks).set(rData).where(eq(tasks.id, rTask.id));
            }
        }

        // Apply kept updates
        for (const kTask of keptTasks) {
            if (kTask.id === existingTask.id) {
                if (Object.keys(updateData).length > 0) {
                    await db.update(tasks).set(updateData).where(eq(tasks.id, kTask.id));
                }
            } else {
                if (Object.keys(sharedUpdateData).length > 0) {
                    await db.update(tasks).set(sharedUpdateData).where(eq(tasks.id, kTask.id));
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
                id: uuidv4(),
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

            await db.insert(tasks).values(newTasksToInsert);
        }

        if (status !== undefined && status !== existingTask.status) {
            await notifyAdminOnTaskStatusChange(req.user, existingTask, status);
        }

        return SuccessResponse(res, { message: "Task updated successfully" }, 200);
    }

    if (Object.keys(updateData).length === 0) {
        return SuccessResponse(res, { message: "No fields provided for update" }, 200);
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

    if (status !== undefined && status !== existingTask.status) {
        await notifyAdminOnTaskStatusChange(req.user, existingTask, status);
    }

    return SuccessResponse(res, { message: "Task updated successfully" }, 200);
};

// ✅ Delete Task by ID
export const deleteTasks = async (req: Request, res: Response) => {
    const validated = await TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existingTask = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!existingTask[0]) {
        throw new NotFound("Task not found");
    } 

    if (existingTask[0].documentation) {
        const [stillUsed] = await db
            .select({ id: tasks.id })
            .from(tasks)
            .where(and(
                eq(tasks.documentation, existingTask[0].documentation),
                ne(tasks.id, id)
            ))
            .limit(1);
        if (!stillUsed) {
            await deletePhotoFromServer(existingTask[0].documentation);
        }
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    SuccessResponse(res, { message: "Task deleted successfully" }, 200);
};

// ✅ Delete Task Documentation
export const deleteTaskDocumentation = async (req: Request, res: Response) => {
    const validated = await TaskIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;

    const [task] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!task) {
        throw new NotFound("Task not found");
    }

    if (task.documentation) {
        const [stillUsed] = await db
            .select({ id: tasks.id })
            .from(tasks)
            .where(and(
                eq(tasks.documentation, task.documentation),
                ne(tasks.id, id)
            ))
            .limit(1);

        if (!stillUsed) {
            // 1. Delete from server disk first
            await deletePhotoFromServer(task.documentation);
        }

        // 2. Delete from database
        if (task.group_id && task.name) {
            await db
                .update(tasks)
                .set({ documentation: null })
                .where(and(
                    eq(tasks.group_id, task.group_id),
                    eq(tasks.name, task.name)
                ));
        } else {
            await db.update(tasks).set({ documentation: null }).where(eq(tasks.id, id));
        }
    }

    SuccessResponse(res, { message: "Task documentation deleted successfully" }, 200);
};

// ✅ Add Voice Note to Task (Admin, Team Leader, or Assigned Engineer)
export const addTaskVoice = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [existingTask] = await db
        .select({ id: tasks.id, project_id: tasks.project_id, user_id: tasks.user_id })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!existingTask) {
        throw new NotFound("Task not found");
    }

    const [project] = existingTask.project_id
        ? await db
            .select({ tester_id: projects.tester_id })
            .from(projects)
            .where(eq(projects.id, existingTask.project_id))
            .limit(1)
        : [];

    const isLeader = project?.tester_id === req.user?.id;
    const isAdmin = req.user?.role === "admin" || req.user?.role === "super_admin";
    const isAssigned = existingTask.user_id === req.user?.id;

    if (!isAdmin && !isLeader && !isAssigned) {
        return res.status(403).json({ success: false, message: "You don't have permission to add voice notes to this task" });
    }

    let voiceUrl: string | null = null;
    if (req.file) {
        voiceUrl = getFileUrl(req, req.file, "voices");
    } else if (req.body.voice && typeof req.body.voice === "string" && req.body.voice.startsWith("data:")) {
        const result = await saveBase64Image(req, req.body.voice, "voices");
        voiceUrl = result.url;
    }

    if (!voiceUrl) {
        return res.status(400).json({ success: false, message: "Voice audio file or data is required" });
    }

    const duration = req.body.duration ? parseInt(req.body.duration, 10) : 0;
    const voiceId = uuidv4();

    await db.insert(taskVoices).values({
        id: voiceId,
        task_id: id,
        user_id: (req.user as any)?.id || null,
        voice_url: voiceUrl,
        duration: isNaN(duration) ? 0 : duration,
    });

    const [savedVoice] = await db
        .select({
            id: taskVoices.id,
            voice_url: taskVoices.voice_url,
            duration: taskVoices.duration,
            createdAt: taskVoices.createdAt,
            user_id: users.id,
            user_name: users.name,
            user_image: users.image,
            user_role: users.role,
        })
        .from(taskVoices)
        .leftJoin(users, eq(taskVoices.user_id, users.id))
        .where(eq(taskVoices.id, voiceId))
        .limit(1);

    const mappedVoice = savedVoice ? {
        ...savedVoice,
        user_role: isLeader ? 'tester' : (savedVoice.user_role || 'engineer')
    } : null;

    SuccessResponse(res, { message: "Voice note added successfully", voice: mappedVoice }, 201);
};

// ✅ Delete Task Voice Note
export const deleteTaskVoice = async (req: Request, res: Response) => {
    const { id, voiceId } = req.params;
    const role = (req.user as any)?.role;
    const userId = (req.user as any)?.id;

    const [voice] = await db
        .select()
        .from(taskVoices)
        .where(and(eq(taskVoices.id, voiceId), eq(taskVoices.task_id, id)))
        .limit(1);

    if (!voice) {
        throw new NotFound("Voice note not found");
    }

    if (role !== "admin" && role !== "super_admin" && voice.user_id !== userId) {
        return res.status(403).json({ success: false, message: "You don't have permission to delete this voice note" });
    }

    // 1. Delete from server disk first
    if (voice.voice_url) {
        await deletePhotoFromServer(voice.voice_url);
    }

    // 2. Delete from database
    await db.delete(taskVoices).where(eq(taskVoices.id, voiceId));

    SuccessResponse(res, { message: "Voice note deleted successfully" }, 200);
};

// ✅ Get Voices for Task
export const getTaskVoices = async (req: Request, res: Response) => {
    const { id } = req.params;

    const [task] = await db
        .select({ id: tasks.id, group_id: tasks.group_id, name: tasks.name })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    let siblingTaskIds: string[] = [id];
    if (task && task.group_id && task.name) {
        const siblings = await db
            .select({ id: tasks.id })
            .from(tasks)
            .where(and(
                eq(tasks.group_id, task.group_id),
                eq(tasks.name, task.name)
            ));
        siblingTaskIds = siblings.map(s => s.id);
    }
    if (!siblingTaskIds.includes(id)) {
        siblingTaskIds.push(id);
    }

    const voices = await db
        .select({
            id: taskVoices.id,
            voice_url: taskVoices.voice_url,
            duration: taskVoices.duration,
            createdAt: taskVoices.createdAt,
            user_id: users.id,
            user_name: users.name,
            user_image: users.image,
            user_role: users.role,
        })
        .from(taskVoices)
        .leftJoin(users, eq(taskVoices.user_id, users.id))
        .where(inArray(taskVoices.task_id, siblingTaskIds))
        .orderBy(desc(taskVoices.createdAt));

    const safeVoices = Array.isArray(voices) ? voices.filter(v => Boolean(v && v.id)) : [];
    SuccessResponse(res, { voices: safeVoices }, 200);
};

export const delayTasks = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const project_id = (req.query.project_id as string)?.trim() || '';
        const user_id = (req.query.user_id as string)?.trim() || '';
        
        const offset = (page - 1) * limit;
        
        // 1. بناء الشروط: نضع شرط التأخير كشرط أساسي دائماً
        const whereConditions: SQL[] = [
            lt(tasks.delivery_date, sql`CURRENT_DATE()`),
            ne(tasks.status, "approve")
        ];

        if (search) {
            whereConditions.push(like(tasks.name, `%${search}%`));
        }  
        // 1. التصفية حسب مشروع معین (إذا وجد)
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push(eq(tasks.project_id, project_id));
        }
        // 1. التصفية حسب مستخدم معین (إذا وجد)
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push(eq(tasks.user_id, user_id));
        }
        
        const userRole = req.user?.role as string | undefined;
        const isGlobalAdmin = userRole === 'admin' || userRole === 'super_admin';
        const currentUserId = req.user?.id;

        if (!isGlobalAdmin && currentUserId) {
            whereConditions.push(
                or(
                    eq(projects.tester_id, currentUserId),
                    eq(tasks.user_id, currentUserId)
                )!
            );
        }

        // دمج جميع الشروط
        const combinedCondition = and(...whereConditions);

        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db
            .select({
                id: tasks.id,
                name: tasks.name,
                description: tasks.description,
                documentation: tasks.documentation,
                status: tasks.status,
                importanc_status: tasks.importanc_status,
                delivery_date: tasks.delivery_date,
                tester_note: tasks.tester_note,
                user_name: users.name,
                user_image: users.image,
                user_phone: users.phone,
                user_id: tasks.user_id,
                project_group: projectGroups.name,
                project_name: projects.name,
                project_id: tasks.project_id,
                tester_id: projects.tester_id,
            })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
            .leftJoin(users, eq(tasks.user_id, users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy(
                sql`CASE WHEN ${tasks.importanc_status} = 'urgent' AND ${tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`,
                desc(tasks.delivery_date),
                desc(tasks.createdAt)
            )
            .$dynamic();

        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db
            .select({ total: count(tasks.id) })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();

        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);

        const mappedTasks = allTasks.map(task => {
            let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
            if (isGlobalAdmin) {
                user_role = 'admin';
            } else if (task.tester_id === currentUserId) {
                user_role = 'leader';
            } else {
                user_role = 'engineer';
            }
            return {
                ...task,
                user_role
            };
        });

        SuccessResponse(res, { 
            tasks: mappedTasks,
            pagination: {
                total: Number(totalCount),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount) / limit)
            }
        }, 200);

    } catch (error) {
        // معالجة الخطأ لتجنب توقف الخادم
        console.error("Error fetching delayed tasks:", error);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي في الخادم" });
    }
};

export const pendingTasks = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = (req.query.search as string) || '';
        const project_id = (req.query.project_id as string)?.trim() || '';
        const user_id = (req.query.user_id as string)?.trim() || '';
        

        const offset = (page - 1) * limit;
        
        // 1. بناء الشروط: نضع شرط التأخير كشرط أساسي دائماً
        const whereConditions: SQL[] = [
            ne(tasks.status, "approve")
        ];

        if (search) {
            whereConditions.push(like(tasks.name, `%${search}%`));
        } 
        // 1. التصفية حسب مشروع معین (إذا وجد)
        if (project_id && project_id !== 'undefined' && project_id !== 'null') {
            whereConditions.push(eq(tasks.project_id, project_id));
        }
        // 1. التصفية حسب مستخدم معین (إذا وجد)
        if (user_id && user_id !== 'undefined' && user_id !== 'null') {
            whereConditions.push(eq(tasks.user_id, user_id));
        }
        const userRole = req.user?.role as string | undefined;
        const isGlobalAdmin = userRole === 'admin' || userRole === 'super_admin';
        const currentUserId = req.user?.id;

        if (!isGlobalAdmin && currentUserId) {
            whereConditions.push(
                or(
                    eq(projects.tester_id, currentUserId),
                    eq(tasks.user_id, currentUserId)
                )!
            );
        }
        // دمج جميع الشروط
        const combinedCondition = and(...whereConditions);

        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db
            .select({
                id: tasks.id,
                name: tasks.name,
                description: tasks.description,
                documentation: tasks.documentation,
                status: tasks.status,
                importanc_status: tasks.importanc_status,
                delivery_date: tasks.delivery_date,
                tester_note: tasks.tester_note,
                user_name: users.name,
                user_image: users.image,
                user_phone: users.phone,
                user_id: tasks.user_id,
                project_group: projectGroups.name,
                project_name: projects.name,
                project_id: tasks.project_id,
                tester_id: projects.tester_id,
            })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
            .leftJoin(users, eq(tasks.user_id, users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy(
                sql`CASE WHEN ${tasks.importanc_status} = 'urgent' AND ${tasks.status} != 'approve' THEN 0 ELSE 1 END ASC`,
                desc(tasks.delivery_date),
                desc(tasks.createdAt)
            )
            .$dynamic();

        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db
            .select({ total: count(tasks.id) })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();

        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);

        const mappedTasks = allTasks.map(task => {
            let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
            if (isGlobalAdmin) {
                user_role = 'admin';
            } else if (task.tester_id === currentUserId) {
                user_role = 'leader';
            } else {
                user_role = 'engineer';
            }
            return {
                ...task,
                user_role
            };
        });

        SuccessResponse(res, { 
            tasks: mappedTasks,
            pagination: {
                total: Number(totalCount),
                page,
                limit,
                totalPages: Math.ceil(Number(totalCount) / limit)
            }
        }, 200);

    } catch (error) {
        // معالجة الخطأ لتجنب توقف الخادم
        console.error("Error fetching delayed tasks:", error);
        res.status(500).json({ success: false, message: "حدث خطأ داخلي في الخادم" });
    }
};

// ✅ Reorder Tasks
export const reorderTasks = async (req: Request, res: Response) => {
    const { tasks: items, taskIds } = req.body;

    let updates: { id: string; sort: number }[] = [];

    if (Array.isArray(items) && items.length > 0) {
        updates = items
            .filter((item: any) => item && item.id && item.sort !== undefined && item.sort !== null)
            .map((item: any) => ({ id: String(item.id), sort: Number(item.sort) }));
    } else if (Array.isArray(taskIds) && taskIds.length > 0) {
        updates = taskIds
            .filter((id: any) => typeof id === 'string' && id.trim())
            .map((id: string, index: number) => ({ id: id.trim(), sort: index + 1 }));
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "No tasks provided for reordering",
        });
    }

    await db.transaction(async (tx) => {
        for (const update of updates) {
            await tx
                .update(tasks)
                .set({ sort: update.sort })
                .where(eq(tasks.id, update.id));
        }
    });

    return SuccessResponse(res, { message: "Tasks reordered successfully" }, 200);
};


