// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, projectGroups, users, groupUsers } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc, sql } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { saveBase64Image } from "../../utils/handleImages";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

// Schema لإنشاء مجموعة مشروع (Project Group)
export const createProjectGroupSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters"),
      
    description: z.string()
      .max(1000, "Description cannot exceed 1000 characters")
      .nullable()
      .optional(),
    documentation: z.string() 
      .nullable()
      .optional(),
    
    project_id: z.string({ required_error: "Project ID is required" }).uuid("Invalid project ID format"),
    users_ids: z
      .array(z.string().uuid("Invalid User ID format inside users_ids"), { required_error: "Users IDs array is required" })
      .min(1, "At least one user ID is required"),
  }),
});

// Schema لتحديث مجموعة مشروع (Project Group)
export const updateProjectGroupSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Group ID format"),
  }),
  body: z.object({
    name: z.string()
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters")
      .optional(),

    description: z.string()
      .max(1000, "Description cannot exceed 1000 characters")
      .nullable()
      .optional(), 

    documentation: z.string() 
      .nullable()
      .optional(),
    project_id: z.string()
      .uuid("Invalid project ID format")
      .nullable()
      .optional(),
      
    users_ids: z
      .array(z.string().uuid("Invalid User ID format inside users_ids"))
      .optional(),
  }),
});

// Schema للعمليات التي تتطلب Project ID
export const ProjectIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
  }),
});

// Schema للعمليات التي تتطلب Group ID
export const GroupIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Group ID format"),
  }),
});


// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Groups
export const getAllGroup = async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const search = (req.query.search as string)?.trim() || '';
    const project_id = (req.query.project_id as string)?.trim() || '';
    
    const offset = (page - 1) * limit;
    const whereConditions: SQL[] = [];

    // 1. التصفية حسب مشروع معین (إذا وجد)
    if (project_id) {
        whereConditions.push(eq(projectGroups.project_id, project_id));
    }

    // 2. البحث باسم المجموعات
    if (search) {
        whereConditions.push(like(projectGroups.name, `%${search}%`));
    }

    if (req.user?.role === 'tester' && req.user?.id) {
        whereConditions.push(eq(projects.tester_id, req.user.id));
    }

    // دمج كافة الشروط في شرط واحد متكامل
    const combinedWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // 3. بناء الاستعلام الأساسي
    let query = db
        .select({
            id: projectGroups.id,
            name: projectGroups.name,
            description: projectGroups.description,
            documentation: projectGroups.documentation,
            project: projects.name,
            project_id: projects.id,
            createdAt: projectGroups.createdAt,
            delay_tasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.delivery_date < NOW() AND tasks.status != 'approve')`.as('delay_tasks'),
            progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id), 0) * 100, 0)`.as('progress'),
            done_progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.group_id = projectGroups.id), 0) * 100, 0)`.as('done_progress')
        })
        .from(projectGroups)
        .leftJoin(projects, eq(projectGroups.project_id, projects.id))
        .orderBy(desc(projectGroups.createdAt))
        .$dynamic();

    // 4. بناء استعلام العد الكلي
    let countQuery = db
        .select({ total: count(projectGroups.id) })
        .from(projectGroups)
        .leftJoin(projects, eq(projectGroups.project_id, projects.id))
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

    const totalCount = countResult[0]?.total ? Number(countResult[0].total) : 0;

    return SuccessResponse(res, { 
        groups: allGroups,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit) || 1
        }
    }, 200);
};

// ✅ Get Group By ID
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
            .where(eq(users.role, "engineer"));

    SuccessResponse(res, { projects_list, groups_list, users_list }, 200);
};

// ✅ Get Group By ID
export const getGroupById = async (req: Request, res: Response) => {
    const validated = await GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const groups = await db
        .select({
            id: projectGroups.id,
            name: projectGroups.name,
            description: projectGroups.description,
            documentation: projectGroups.documentation,
            project: projects.name,
            project_id: projects.id,
            createdAt: projectGroups.createdAt,
        })
        .from(projectGroups)
        .leftJoin(projects, eq(projectGroups.project_id, projects.id))
        .where(eq(projectGroups.id, id))
        .limit(1);
  
    if (!groups[0]) {
        throw new NotFound("Project Group not found");
    }

    SuccessResponse(res, { group: groups[0] }, 200);
};

// ✅ Create Project Group
export const createProjectGroup = async (req: Request, res: Response) => {
    const validated = await createProjectGroupSchema.parseAsync({ body: req.body });
    const { name, description, project_id, users_ids, documentation } = validated.body;

    let savedProjectDocumentation: string | null = null; 

    if (documentation) {
        const result = await saveBase64Image(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    }
    const groupId = uuidv4();

    await db.insert(projectGroups).values({
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
        await db.insert(groupUsers).values(groupUsersData);
    }

    SuccessResponse(res, { message: "Project group created successfully" }, 201);
};

// ✅ Update Project Group
export const updateProjectGroup = async (req: Request, res: Response) => {
    const validated = await updateProjectGroupSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { name, description, project_id, users_ids, documentation } = validated.body;
  
    const existingGroup = await db
        .select()
        .from(projectGroups)
        .where(eq(projectGroups.id, id))
        .limit(1);

    if (!existingGroup[0]) {
        throw new NotFound("Project group not found");
    } 

    let ProjectDocumentation = existingGroup[0].documentation;

    if (documentation !== undefined) {
        if (documentation) {
            const result = await saveBase64Image(req, documentation, "projects");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingGroup[0].documentation) {
                await deletePhotoFromServer(existingGroup[0].documentation);
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
    if (documentation !== undefined) updateData.documentation = ProjectDocumentation;
  
    if (Object.keys(updateData).length > 0) {
        await db.update(projectGroups).set(updateData).where(eq(projectGroups.id, id));
    }

    if (users_ids !== undefined) {
        await db.delete(groupUsers).where(eq(groupUsers.group_id, id));
        if (users_ids.length > 0) {
            const groupUsersData = users_ids.map(userId => ({
                group_id: id,
                user_id: userId
            }));
            await db.insert(groupUsers).values(groupUsersData);
        }
    }

    SuccessResponse(res, { message: "Project group updated successfully" }, 200);
};

// ✅ Delete Project Group
export const deleteProjectGroup = async (req: Request, res: Response) => {
    if (req.user?.role === 'tester') {
        return res.status(403).json({ success: false, message: "Forbidden: Testers cannot delete groups" });
    }
    const validated = await GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existingGroup = await db
        .select()
        .from(projectGroups)
        .where(eq(projectGroups.id, id))
        .limit(1);

    if (!existingGroup[0]) {
        throw new NotFound("Project group not found");
    }

    // حذف ملف التوثيق/الصورة من السيرفر قبل المسح
    if (existingGroup[0].documentation) {
        await deletePhotoFromServer(existingGroup[0].documentation);
    }
    // حذف التوثيق إذا كان موجوداً
    if ((existingGroup[0] as any).documentation) {
        await deletePhotoFromServer((existingGroup[0] as any).documentation);
    }

    await db.delete(projectGroups).where(eq(projectGroups.id, id));

    SuccessResponse(res, { message: "Project group deleted successfully" }, 200);
};

// ✅ Get Group Users
export const getGroupUsers = async (req: Request, res: Response) => {
    const validated = await GroupIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
    
    const group_users = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
            image: users.image
        })
        .from(groupUsers)
        .innerJoin(users, eq(groupUsers.user_id, users.id))
        .where(eq(groupUsers.group_id, id));

    SuccessResponse(res, { users: group_users }, 200);
};