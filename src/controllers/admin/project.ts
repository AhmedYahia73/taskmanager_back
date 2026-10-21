// src/controllers/Project/ProjectController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { projects, users, tasks, projectUsers } from "../../models/schema"; 
import { SQL, and, or, eq, ne, like, count, desc, sql, inArray } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { getFileUrl, parseArray } from "../../middlewares/upload";
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
    
    documentation: z.any().nullable().optional(),
    logo: z.any().optional().nullable(),
    
    tester_id: z.union([z.string().uuid("Invalid tester ID format"), z.literal("")]).optional().nullable(),
    users_ids: z.preprocess(
      parseArray,
      z.array(
        z.string().uuid("Invalid User ID format inside users_ids"),
        { required_error: "Users IDs array is required" }
      ).min(1, "At least one user ID is required")
    ),
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

    documentation: z.any()
      .nullable()
      .optional(),

    logo: z.any()
      .nullable()
      .optional(),

    tester_id: z.union([z.string().uuid("Invalid tester ID format"), z.literal("")])
      .nullable()
      .optional(),

    users_ids: z.preprocess(
      parseArray,
      z.array(z.string().uuid("Invalid User ID format inside users_ids")).optional()
    ),
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
    
    if ((req.user?.role === 'engineer' || req.user?.role === 'leader_sales') && req.user?.id) {
        const userProjectsSubquery = db.select({ project_id: projectUsers.project_id }).from(projectUsers).where(eq(projectUsers.user_id, req.user.id));
        whereConditions.push(
            or(
                eq(projects.tester_id, req.user.id),
                inArray(projects.id, userProjectsSubquery)
            )!
        );
    }

    // بناء استعلام البيانات الأساسي مع نسبة الإنجاز
    let query = db
        .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            documentation: projects.documentation,
            logo: projects.logo,
            createdAt: projects.createdAt,
            tester_image: users.image,
            tester_name: users.name,
            tester_role: users.role,
            tester_id: projects.tester_id,
            // 📊 حساب نسبة الإنجاز %
            progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'approve' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )
            `.as('progress'),
            done_progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'done' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )
            `.as('done_progress')
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

    // Fetch users for all projects manually to avoid JSON_ARRAYAGG error
    let allProjectUsers: any[] = [];
    if (allProjects.length > 0) {
        const projectIds = allProjects.map(p => p.id);
        allProjectUsers = await db
            .select({
                project_id: projectUsers.project_id,
                id: users.id,
                name: users.name,
                image: users.image,
                role: users.role
            })
            .from(projectUsers)
            .innerJoin(users, eq(users.id, projectUsers.user_id))
            .where(inArray(projectUsers.project_id, projectIds));
    }

    const currentUserId = req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    const mappedProjects = allProjects.map(project => {
        let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
        if (isGlobalAdmin) {
            user_role = 'admin';
        } else if (project.tester_id === currentUserId) {
            user_role = 'leader';
        } else {
            user_role = 'engineer';
        }

        return {
            ...project,
            user_role,
            users: allProjectUsers.filter(u => u.project_id === project.id)
        };
    });

    // إرسال النتيجة مع معلومات الـ Pagination
    SuccessResponse(res, { 
        Projects: mappedProjects,
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
            tester_role: users.role,
            tester_id: projects.tester_id, 
            logo: projects.logo,
            // 📊 حساب نسبة الإنجاز %
            progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'approve' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )
            `.as('progress'),
            done_progress: sql<number>`
                COALESCE(
                    ROUND(
                        (COUNT(CASE WHEN ${tasks.status} = 'done' THEN 1 END) * 100.0) / 
                        NULLIF(COUNT(${tasks.id}), 0)
                    , 2), 
                    0
                )
            `.as('done_progress')
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

    const projectData = Project[0];
    const currentUserId = req.user?.id;
    const isGlobalAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    let user_role: 'admin' | 'leader' | 'engineer' = 'engineer';
    if (isGlobalAdmin) {
        user_role = 'admin';
    } else if (projectData.tester_id === currentUserId) {
        user_role = 'leader';
    } else {
        user_role = 'engineer';
    }

    // 4. إرسال الاستجابة بنجاح
    SuccessResponse(res, { Project: { ...projectData, user_role } }, 200);
};

// ✅ Get Options / Dropdown Lists (Non-Admin Users for Team Leader and Engineers)
export const lists = async (req: Request, res: Response) => {
    const nonAdminCondition = and(ne(users.role, "admin"), ne(users.role, "super_admin"));

    const nonAdminUsers = await db
        .select({
            id: users.id,
            name: users.name,
            role: users.role,
        })
        .from(users)
        .where(nonAdminCondition);

    SuccessResponse(res, { 
        testers: nonAdminUsers, 
        users_list: nonAdminUsers,
        users: nonAdminUsers
    }, 200);
};


// ✅ Create Project
export const createProject = async (req: Request, res: Response) => {
    const validated = await createProjectSchema.parseAsync({ body: req.body });
    let { name, description, documentation, logo, tester_id, users_ids } = validated.body;
    
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Only admins can create projects" });
    } else if (!tester_id || tester_id === "") {
        return res.status(400).json({ success: false, message: "Tester/Leader ID is required when created by admin" });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const logoFile = files?.["logo"]?.[0];
    const docFile = files?.["documentation"]?.[0];

    let savedProjectLogo: string | null = null; 
    if (logoFile) {
        savedProjectLogo = getFileUrl(req, logoFile, "projects");
    } else if (logo && typeof logo === "string" && logo.startsWith("data:")) {
        const result = await saveBase64Image(req, logo, "projects");
        savedProjectLogo = result.url;
    } else if (typeof logo === "string" && logo && logo !== "null" && logo !== "undefined") {
        savedProjectLogo = logo;
    }

    if (!savedProjectLogo) {
        return res.status(400).json({ success: false, message: "Logo is required" });
    }

    let savedProjectDocumentation: string | null = null; 
    if (docFile) {
        savedProjectDocumentation = getFileUrl(req, docFile, "projects");
    } else if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
        const result = await saveBase64Image(req, documentation, "projects");
        savedProjectDocumentation = result.url;
    } else if (typeof documentation === "string" && documentation && documentation !== "null" && documentation !== "undefined") {
        savedProjectDocumentation = documentation;
    }

    const projectId = uuidv4();

    await db.insert(projects).values({
        id: projectId,
        name,
        description,
        tester_id,
        documentation: savedProjectDocumentation,
        logo: savedProjectLogo,
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
    let { name, description, documentation, logo, tester_id, users_ids } = validated.body;
  
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        tester_id = undefined; // Non-admin cannot reassign project leader
    } else if (tester_id === "") {
        return res.status(400).json({ success: false, message: "Tester ID cannot be empty" });
    }
  
    // تحقق من وجود المشروع
    const existingProject = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

    if (!existingProject[0]) {
        throw new NotFound("Project not found");
    } 

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const logoFile = files?.["logo"]?.[0];
    const docFile = files?.["documentation"]?.[0];

    let ProjectLogo = existingProject[0].logo;
    if (logoFile) {
        ProjectLogo = getFileUrl(req, logoFile, "projects");
        if (existingProject[0].logo) {
            await deletePhotoFromServer(existingProject[0].logo);
        }
    } else if (logo !== undefined) {
        if (logo && typeof logo === "string" && logo.startsWith("data:")) {
            const result = await saveBase64Image(req, logo, "projects");
            if (existingProject[0].logo) {
                await deletePhotoFromServer(existingProject[0].logo);
            }
            ProjectLogo = result.url;
        } else if (logo === "" || logo === null || logo === "null") {
            if (existingProject[0].logo) {
                await deletePhotoFromServer(existingProject[0].logo);
            }
            ProjectLogo = null;
        }
    }

    let ProjectDocumentation = existingProject[0].documentation;
    const shouldDeleteDoc = (req.body as any).delete_documentation === "true" || 
                            (req.body as any).delete_documentation === true || 
                            documentation === "" || 
                            documentation === null || 
                            documentation === "null";

    if (docFile) {
        ProjectDocumentation = getFileUrl(req, docFile, "projects");
        if (existingProject[0].documentation) {
            await deletePhotoFromServer(existingProject[0].documentation);
        }
    } else if (shouldDeleteDoc) {
        if (existingProject[0].documentation) {
            await deletePhotoFromServer(existingProject[0].documentation);
        }
        ProjectDocumentation = null;
    } else if (documentation !== undefined) {
        if (documentation && typeof documentation === "string" && documentation.startsWith("data:")) {
            const result = await saveBase64Image(req, documentation, "projects");
            if (existingProject[0].documentation) {
                await deletePhotoFromServer(existingProject[0].documentation);
            }
            ProjectDocumentation = result.url;
        }
    }

    // بناء كائن التحديث بشكل يحافظ على البيانات الحالية في حال عدم إرسالها
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (tester_id !== undefined) updateData.tester_id = tester_id;
    if (docFile || shouldDeleteDoc || documentation !== undefined) updateData.documentation = ProjectDocumentation;
    if (logoFile || logo !== undefined) updateData.logo = ProjectLogo;
  
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

// ✅ Delete Project Documentation
export const deleteProjectDocumentation = async (req: Request, res: Response) => {
    const validated = await ProjectIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;

    const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);

    if (!project) {
        throw new NotFound("Project not found");
    }

    if (project.documentation) {
        // 1. Delete from server disk first
        await deletePhotoFromServer(project.documentation);
        // 2. Delete from database
        await db.update(projects).set({ documentation: null }).where(eq(projects.id, id));
    }

    SuccessResponse(res, { message: "Project documentation deleted successfully" }, 200);
};

// ✅ Delete Project
export const deleteProject = async (req: Request, res: Response) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: "Forbidden: Only admins can delete projects" });
    }
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
      if (existingProject[0].logo) {
        await deletePhotoFromServer(existingProject[0].logo);
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