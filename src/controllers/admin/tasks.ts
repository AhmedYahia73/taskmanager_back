// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, projectGroups, tasks, users } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";

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
    
    const offset = (page - 1) * limit;
    const whereConditions: SQL[] = [];

    if (search) {
        whereConditions.push(like(tasks.name, `%${search}%`));
    }

    let query = db
        .select({
            id: tasks.id,
            name: tasks.name,
            description: tasks.description,
            status: tasks.status,
            delivery_date: tasks.delivery_date,
            tester_note: tasks.tester_note,
            user_name: users.name,
            user_phone: users.phone,
            project_group: projectGroups.name,
            project_name: projects.name,
        })
        .from(tasks)
        .leftJoin(projects, eq(tasks.project_id, projects.id))
        .leftJoin(projectGroups, eq(tasks.group_id, projectGroups.id))
        .leftJoin(users, eq(tasks.user_id, users.id))
        .orderBy(desc(tasks.createdAt))
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
            delivery_date: tasks.delivery_date,
            tester_note: tasks.tester_note,
            project_name: projects.name,
            project_id: projects.id,
            group_name: projectGroups.name,
            group_id: projectGroups.id,
            user_name: users.name,
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
        tester_note, 
        users_ids 
    } = validated.body;

    const tasksToInsert = users_ids.map((userId) => ({
        name,
        description,
        project_id,
        group_id,
        user_id: userId,
        delivery_date: delivery_date ?? null,
        status,
        tester_note: tester_note ?? null,
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
        tester_note 
    } = validated.body;
  
    const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!existingTask) {
        throw new NotFound("Task not found");
    } 

    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (project_id !== undefined) updateData.project_id = project_id;
    if (group_id !== undefined) updateData.group_id = group_id;
    if (user_id !== undefined) updateData.user_id = user_id;
    if (delivery_date !== undefined) updateData.delivery_date = delivery_date;
    if (status !== undefined) updateData.status = status;
    if (tester_note !== undefined) updateData.tester_note = tester_note;

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

    await db.delete(tasks).where(eq(tasks.id, id));

    SuccessResponse(res, { message: "Task deleted successfully" }, 200);
};