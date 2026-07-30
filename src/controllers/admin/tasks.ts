// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, projectGroups, tasks, users } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc, sql, lte, ne } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";
import { saveBase64Image } from "../../utils/handleImages";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

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

    documentation: z.string() 
      .nullable()
      .optional(),
    tester_note: z
      .string()
      .trim()
      .max(1000, "Tester Note cannot exceed 1000 characters")
      .nullable()
      .optional(),

    delivery_date: z.coerce
      .date({ invalid_type_error: "Invalid date format" })
      .nullable()
      .optional(),

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

    users_ids: z
      .array(
        z.string().uuid("Invalid User ID format inside users_ids"),
        { required_error: "Users IDs array is required" }
      )
      .min(1, "At least one user ID is required"),
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

    documentation: z.string() 
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

      delivery_date: z.coerce
        .date({ invalid_type_error: "Invalid date format" })
        .nullable()
        .optional(),

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
            user_phone: users.phone,
            user_id: tasks.user_id,
            user_image: users.image,
            project_group: projectGroups.name,
            project_name: projects.name,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.project_id, projects.id))
        .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
        .leftJoin(users, eq(tasks.user_id, users.id))
        .orderBy(
            sql`CASE WHEN ${tasks.importanc_status} = 'urgent' THEN 0 ELSE 1 END ASC`,
            sql`${tasks.delivery_date} ASC`,
            desc(tasks.createdAt)
        )
        .$dynamic();

    let countQuery = db
        .select({ total: count(tasks.id) })
        .from(tasks)
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

    SuccessResponse(res, { 
        tasks: allTasks,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit)
        }
    }, 200);
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
            group_name: projectGroups.name,
            group_id: projectGroups.id,
            user_name: users.name,
            documentation: tasks.documentation,
            user_id: users.id,
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

    SuccessResponse(res, { task: taskResult[0] }, 200);
};

// ✅ Create Tasks (Multi-User Duplicate)
export const createTasks = async (req: Request, res: Response) => {
    const validated = await createTasksSchema.parseAsync({ body: req.body });
    const { 
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
    } = validated.body;

    let savedProjectDocumentation: string | null = null; 

    if (documentation) {
        const result = await saveBase64Image(req, documentation, "projects");
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

    await db.insert(tasks).values(tasksToInsert);

    return SuccessResponse(
        res, 
        { message: `${tasksToInsert.length} tasks created successfully` }, 
        201
    );
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
        delivery_date, 
        status, 
        importanc_status,
        tester_note,
        documentation,
    } = validated.body;
  
    const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!existingTask) {
        throw new NotFound("Task not found");
    } 

    let ProjectDocumentation = existingTask.documentation;

    if (documentation !== undefined) {
        if (documentation) {
            const result = await saveBase64Image(req, documentation, "projects");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingTask.documentation) {
                await deletePhotoFromServer(existingTask.documentation);
            }
            ProjectDocumentation = result.url;
        } else { 
            ProjectDocumentation = null;
        }
    }

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (group_id !== undefined) updateData.group_id = group_id;
    if (user_id !== undefined) updateData.user_id = user_id;
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (status !== undefined) updateData.status = status;
    if (importanc_status !== undefined) updateData.importanc_status = importanc_status;
    if (tester_note !== undefined) updateData.tester_note = tester_note;
    if (documentation !== undefined) updateData.documentation = ProjectDocumentation;

    if (Object.keys(updateData).length === 0) {
        return SuccessResponse(res, { message: "No fields provided for update" }, 200);
    }

    await db.update(tasks).set(updateData).where(eq(tasks.id, id));

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
        await deletePhotoFromServer(existingTask[0].documentation);
    }

    await db.delete(tasks).where(eq(tasks.id, id));

    SuccessResponse(res, { message: "Task deleted successfully" }, 200);
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
            lte(tasks.delivery_date, sql`NOW()`)
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

        // دمج جميع الشروط
        const combinedCondition = and(...whereConditions);

        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db
            .select({
                id: tasks.id,
                name: tasks.name,
                description: tasks.description,
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
            })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
            .leftJoin(users, eq(tasks.user_id, users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy(
                sql`CASE WHEN ${tasks.importanc_status} = 'urgent' THEN 0 ELSE 1 END ASC`,
                sql`${tasks.delivery_date} ASC`,
                desc(tasks.createdAt)
            )
            .$dynamic();

        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db
            .select({ total: count(tasks.id) })
            .from(tasks)
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();

        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);

        SuccessResponse(res, { 
            tasks: allTasks,
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
        // دمج جميع الشروط
        const combinedCondition = and(...whereConditions);

        // 2. تطبيق الشروط على الاستعلام الرئيسي
        let query = db
            .select({
                id: tasks.id,
                name: tasks.name,
                description: tasks.description,
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
            })
            .from(tasks)
            .leftJoin(projects, eq(tasks.project_id, projects.id))
            .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
            .leftJoin(users, eq(tasks.user_id, users.id))
            .where(combinedCondition) // استخدمنا الشروط المدمجة هنا
            .orderBy(
                sql`CASE WHEN ${tasks.importanc_status} = 'urgent' THEN 0 ELSE 1 END ASC`,
                sql`${tasks.delivery_date} ASC`,
                desc(tasks.createdAt)
            )
            .$dynamic();

        // 3. تطبيق نفس الشروط على استعلام العدد
        let countQuery = db
            .select({ total: count(tasks.id) })
            .from(tasks)
            .where(combinedCondition) // استخدمنا نفس الشروط المدمجة هنا أيضاً
            .$dynamic();

        const [allTasks, [{ total: totalCount }]] = await Promise.all([
            query.limit(limit).offset(offset),
            countQuery
        ]);

        SuccessResponse(res, { 
            tasks: allTasks,
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

