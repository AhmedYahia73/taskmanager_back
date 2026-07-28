// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, users, tasks, projectUsers } from "../../models/schema"; 
import { SQL, and, eq, like, count, desc, sql } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

// الـ Schema الخاص بإنشاء مشروع (Project) جديد
export const createProjectSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters"),
            
    description: z.string()
      .max(1000, "Description cannot exceed 1000 characters")
      .nullable()
      .optional(),
    
    documentation: z.string({ required_error: "Documentation is required" }),
    
    tester_id: z.string({ required_error: "Tester ID is required" }).uuid("Invalid tester ID format"),
    users_ids: z
    .array(
    z.string().uuid("Invalid User ID format inside users_ids"),
    { required_error: "Users IDs array is required" }
    )
    .min(1, "At least one user ID is required"),
  }),
});

// 🛡️ الـ Schema الخاص بتحديث مشروع (Project)
export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
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

    tester_id: z.string()
      .uuid("Invalid tester ID format")
      .nullable()
      .optional(),

    users_ids: z
      .array(z.string().uuid("Invalid User ID format inside users_ids"))
      .optional(),
  }),
});

// الـ Schema للعمليات التي تتطلب المعرف ID فقط في الـ parameters
export const ProjectIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid Project ID format"),
  }),
});


// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get All Projects With Progress Percentage
export const getAllProject = async (req: Request, res: Response) => {
    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [];

    // تطبيق البحث بالاسم في حال وجوده
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(like(projects.name, searchPattern));
    }

    // بناء استعلام البيانات الأساسي مع نسبة الإنجاز
    let query = db
        .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            documentation: projects.documentation,
            createdAt: projects.createdAt,
            tester_image: users.image,
            tester_name: users.name,
            // 📊 حساب نسبة الإنجاز %
            progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'approved' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )::float
            `
        })
        .from(projects)
        .leftJoin(users, eq(projects.tester_id, users.id))
        .leftJoin(tasks, eq(tasks.project_id, projects.id))
        .groupBy(projects.id, users.id)
        .orderBy(desc(projects.createdAt))
        .$dynamic();

    // بناء استعلام الـ Count للحصول على إجمالي عدد المشروعات الفريدة
    let countQuery = db
        .select({ total: count(sql`DISTINCT ${projects.id}`) })
        .from(projects)
        .leftJoin(users, eq(projects.tester_id, users.id))
        .$dynamic();

    // ربط شروط البحث بالاستعلامات
    if (whereConditions.length > 0) {
        const combinedCondition = and(...whereConditions);
        query = query.where(combinedCondition);
        countQuery = countQuery.where(combinedCondition);
    }

    // تنفيذ الاستعلامين بالتوازي
    const [allProjects, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    // إرسال النتيجة مع معلومات الـ Pagination
    SuccessResponse(res, { 
        Projects: allProjects,
        pagination: {
            total: Number(totalCount),
            page,
            limit,
            totalPages: Math.ceil(Number(totalCount) / limit)
        }
    }, 200);
};

// ✅ Get Project By ID With Progress Percentage
export const getProjectById = async (req: Request, res: Response) => {
    // 1. التحقق من صحة المعرف من الـ Schema
    const validated = await ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    // 2. تنفيذ استعلام جلب بيانات المشروع ونسبة الإنجاز
    const Project = await db
        .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            documentation: projects.documentation,
            createdAt: projects.createdAt,
            tester_image: users.image,
            tester_name: users.name,
            tester_id: users.id, 
            // 📊 حساب نسبة الإنجاز %
            progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'approved' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )::float
            `
        })
        .from(projects)
        .leftJoin(users, eq(projects.tester_id, users.id))
        .leftJoin(tasks, eq(tasks.project_id, projects.id))
        .where(eq(projects.id, id))
        .groupBy(projects.id, users.id)
        .limit(1);

    // 3. التحقق من وجود المشروع
    if (!Project[0]) {
        throw new NotFound("Project not found");
    }

    // 4. إرسال الاستجابة بنجاح
    SuccessResponse(res, { Project: Project[0] }, 200);
};

// ✅ Get Group By ID
export const lists = async (req: Request, res: Response) => {
 
    const testers = await db
    .select({
        id: users.id,
        name: users.name,
    })
    .from(users)
    .where(eq(users.role, "tester")); 
    const users_list = await db
        .select({
            id: users.id,
            name: users.name,
        })
        .from(users)
        .where(eq(users.role, "engineer"));

    SuccessResponse(res, { testers, users_list}, 200);
};


// ✅ Create Project
export const createProject = async (req: Request, res: Response) => {
    const validated = await createProjectSchema.parseAsync({ body: req.body });
    const { name, description, documentation, tester_id, users_ids } = validated.body;

    let savedProjectDocumentation: string | null = null; 

    if (documentation) {
        const result = await saveBase64Image(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    }

    const projectId = uuidv4();

    await db.insert(projects).values({
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
        await db.insert(projectUsers).values(projectUsersData);
    }

    SuccessResponse(res, { message: "Project created successfully" }, 201);
};

// ✅ Update Project
export const updateProject = async (req: Request, res: Response) => {
    const validated = await updateProjectSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { name, description, documentation, tester_id, users_ids } = validated.body;
  
    // تحقق من وجود المشروع
    const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

    if (!existingProject[0]) {
        throw new NotFound("Project not found");
    } 

    let ProjectDocumentation = existingProject[0].documentation;

    if (documentation !== undefined) {
        if (documentation) {
            const result = await saveBase64Image(req, documentation, "projects");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingProject[0].documentation) {
                await deletePhotoFromServer(existingProject[0].documentation);
            }
            ProjectDocumentation = result.url;
        } else { 
            ProjectDocumentation = null;
        }
    }

    // بناء كائن التحديث بشكل يحافظ على البيانات الحالية في حال عدم إرسالها
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tester_id !== undefined) updateData.tester_id = tester_id;
    if (documentation !== undefined) updateData.documentation = ProjectDocumentation;
  
    if (Object.keys(updateData).length > 0) {
        await db.update(projects).set(updateData).where(eq(projects.id, id));
    }

    if (users_ids !== undefined) {
        await db.delete(projectUsers).where(eq(projectUsers.project_id, id));
        if (users_ids.length > 0) {
            const projectUsersData = users_ids.map(userId => ({
                project_id: id,
                user_id: userId
            }));
            await db.insert(projectUsers).values(projectUsersData);
        }
    }

    SuccessResponse(res, { message: "Project updated successfully" }, 200);
};

// ✅ Delete Project
export const deleteProject = async (req: Request, res: Response) => {
    const validated = await ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

    if (!existingProject[0]) {
        throw new NotFound("Project not found");
    }

    // حذف ملف التوثيق/الصورة من السيرفر قبل المسح
    if (existingProject[0].documentation) {
        await deletePhotoFromServer(existingProject[0].documentation);
    }

    await db.delete(projects).where(eq(projects.id, id));

    SuccessResponse(res, { message: "Project deleted successfully" }, 200);
};

// ✅ Get Project Users
export const getProjectUsers = async (req: Request, res: Response) => {
    const validated = await ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
    
    const project_users = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
            image: users.image
        })
        .from(projectUsers)
        .innerJoin(users, eq(projectUsers.user_id, users.id))
        .where(eq(projectUsers.project_id, id));

    SuccessResponse(res, { users: project_users }, 200);
};