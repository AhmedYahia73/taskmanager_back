// src/controllers/User/UserController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { 
  users, 
  shifts, 
  zones, 
  departments, 
  jobs,
  attendance, 
  bonuses, 
  deductions, 
  holidayRequests, 
  onlineRequests, 
  permissions, 
  salaries, 
  groupUsers, 
  projectUsers, 
  tasks, 
  projects, 
  notesBoard, 
  taskVoices,
  salesProjects,
  salesProjectUsers
} from "../../models/schema"; 
import { SQL, and, or, eq, like, count, desc, ne, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from "uuid";
import { SuccessResponse } from "../../utils/response";
import { calculateAttendanceReport } from "../../services/attendanceService";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { getFileUrl } from "../../middlewares/upload";
import { z } from "zod";

// ==========================================
// 🛡️ Helpers for Projects & Sales Projects
// ==========================================

export function parseProjectIds(raw: any, singleId?: any): string[] {
  let ids: (string | null | undefined)[] = [];
  if (Array.isArray(raw)) {
    ids = raw;
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) ids = parsed;
      else if (parsed) ids = [parsed];
    } catch {
      ids = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
    }
  }

  if (singleId && typeof singleId === "string" && singleId.trim()) {
    ids.push(singleId.trim());
  }

  return [...new Set(ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0))];
}

export async function syncProjectUsers(userId: string, projectIds: string[]) {
  try {
    await db.delete(projectUsers).where(eq(projectUsers.user_id, userId));
    if (projectIds.length > 0) {
      await db.insert(projectUsers).values(
        projectIds.map((pid) => ({
          id: uuidv4(),
          user_id: userId,
          project_id: pid,
        }))
      );
    }
  } catch (err) {
    console.error("Error syncing project_users:", err);
  }
}

export async function syncSalesProjectUsers(userId: string, projectIds: string[]) {
  try {
    await db.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, userId));
    if (projectIds.length > 0) {
      await db.insert(salesProjectUsers).values(
        projectIds.map((projId) => ({
          id: uuidv4(),
          user_id: userId,
          sales_project_id: projId,
        }))
      );
    }
  } catch (err) {
    console.error("Error syncing sales_project_users:", err);
  }
}

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

// الـ Schema الخاص بإنشاء مسؤول (User) جديد
export const createUserSchema = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" })
      .min(1, "Name cannot be empty")
      .max(200, "Name cannot exceed 200 characters"),
    
    email: z.string({ required_error: "Email is required" })
      .email("Invalid email format")
      .max(100, "Email cannot exceed 100 characters"),
    
    phone: z.string({ required_error: "Phone is required" })
      .min(5, "Phone is too short")
      .max(20, "Phone cannot exceed 20 characters"),
    
    whatsapp: z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()),
    
    password: z.string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    
    image: z.any().nullable().optional(),

    role: z.enum(["engineer", "sales", "leader_sales"]).optional().default("engineer"),
    project_ids: z.any().optional(),
    project_id: z.string().optional().nullable(),
    sales_project_ids: z.any().optional(),
    sales_project_id: z.string().optional().nullable(),

    status: z.enum(["active", "inactive"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be either 'active' or 'inactive'",
    }),

    yearly_holidays: z.preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean().optional()),

    zone_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Zone ID format").optional().nullable()),
    shift_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Shift ID format").optional().nullable()),
    department_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Department ID format").optional().nullable()),
    job_id: z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), z.string().uuid("Invalid Job ID format").optional().nullable()),
    vector_image_array: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {}
      }
      return val;
    }, z.array(z.number()).nullable().optional()),
  }),
});

// الـ Schema الخاص بتحديث مسؤول (User)
export const updateUserSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid User ID format"),
  }),
  body: z.object({
    name: z.string().min(1, "Name cannot be empty").max(200).optional(),
    email: z.string().email("Invalid email format").max(100).optional(),
    phone: z.string().min(5).max(20).optional(),
    whatsapp: z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    image: z.any().nullable().optional(),
    role: z.enum(["engineer", "sales", "leader_sales", "admin", "super_admin"]).optional(),
    project_ids: z.any().optional(),
    project_id: z.string().optional().nullable(),
    sales_project_ids: z.any().optional(),
    sales_project_id: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    yearly_holidays: z.preprocess((val) => {
      if (val === "true" || val === true) return true;
      if (val === "false" || val === false) return false;
      return val;
    }, z.boolean().optional()),
    zone_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Zone ID format").optional().nullable()),
    shift_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Shift ID format").optional().nullable()),
    department_id: z.preprocess((val) => (val === "" ? undefined : val), z.string().uuid("Invalid Department ID format").optional().nullable()),
    job_id: z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), z.string().uuid("Invalid Job ID format").optional().nullable()),
    vector_image_array: z.preprocess((val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {}
      }
      return val;
    }, z.array(z.number()).nullable().optional()),
  }),
});

// الـ Schema للعمليات التي تتطلب المعرف ID فقط في الـ parameters
export const UserIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "ID is required" }).uuid("Invalid User ID format"),
  }),
});


// ==========================================
// 🎮 Controllers
// ==========================================

// شرط الفلترة الموحد للتحقق من الأدوار المقبولة (engineer / leader_sales / sales)
const validUserRolesCondition = or(eq(users.role, "engineer"), eq(users.role, "leader_sales"), eq(users.role, "sales"));

// ✅ Get All Users
export const getAllUser = async (req: Request, res: Response) => {
    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    const role = (req.query.role as string)?.trim() || '';
    
    const offset = (page - 1) * limit;

    let whereConditions: SQL[] = [];

    // 1. الفلترة الأساسية: جلب المستخدمين بناء على دور معين لو اتبعث في الطلب
    if (role && (role === "engineer" || role === "leader_sales" || role === "sales")) {
        whereConditions.push(eq(users.role, role));
    } else {
        whereConditions.push(validUserRolesCondition as SQL);
    }

    // 2. تطبيق البحث (Search) بالاسم، الهاتف، أو البريد الإلكتروني
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push(
            or(
                like(users.name, searchPattern),
                like(users.phone, searchPattern),
                like(users.whatsapp, searchPattern),
                like(users.email, searchPattern)
            ) as SQL
        );
    }

    // 3. بناء استعلام البيانات الأساسي (Base Query)
    let query = db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            whatsapp: users.whatsapp,
            image: users.image,
            role: users.role,
            status: users.status, 
            yearly_holidays: users.yearly_holidays,
            zone_id: users.zone_id,
            shift_id: users.shift_id,
            department_id: users.department_id,
            job_id: users.job_id,
            job_name: jobs.name,
            sales_project_id: users.sales_project_id,
            sales_project_ids: users.sales_project_ids,
            createdAt: users.createdAt,
            delay_tasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.delivery_date < CURRENT_DATE() AND tasks.status != 'approve')`.as('delay_tasks'),
            progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('progress'),
            done_progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('done_progress'),
            used_holidays: sql<number>`(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
            remaining_holidays: sql<number>`IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
        })
        .from(users)
        .leftJoin(jobs, eq(users.job_id, jobs.id))
        .orderBy(desc(users.createdAt)) // ترتيب الأحدث أولاً
        .$dynamic();

    // 4. بناء استعلام الـ Count لحساب العدد الإجمالي متوافقاً مع فلاتر البحث
    let countQuery = db
        .select({ total: count() })
        .from(users)
        .$dynamic();

    // ربط الشروط بالاستعلامات
    if (whereConditions.length > 0) {
        query = query.where(and(...whereConditions));
        countQuery = countQuery.where(and(...whereConditions));
    }

    // 5. تنفيذ الاستعلامين بالتوازي (Parallel Execution)
    const [allUsers, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);

    const userIds = allUsers.map(u => u.id);
    const [puRows, spuRows] = await Promise.all([
        userIds.length > 0 
            ? db.select({ user_id: projectUsers.user_id, project_id: projectUsers.project_id })
                .from(projectUsers)
                .where(inArray(projectUsers.user_id, userIds))
                .catch(() => [])
            : [],
        userIds.length > 0 
            ? db.select({ user_id: salesProjectUsers.user_id, sales_project_id: salesProjectUsers.sales_project_id })
                .from(salesProjectUsers)
                .where(inArray(salesProjectUsers.user_id, userIds))
                .catch(() => [])
            : []
    ]);

    const userProjectsMap = new Map<string, string[]>();
    for (const r of puRows) {
        if (r.user_id && r.project_id) {
            if (!userProjectsMap.has(r.user_id)) userProjectsMap.set(r.user_id, []);
            userProjectsMap.get(r.user_id)!.push(r.project_id);
        }
    }

    const userSalesProjectsMap = new Map<string, string[]>();
    for (const r of spuRows) {
        if (r.user_id && r.sales_project_id) {
            if (!userSalesProjectsMap.has(r.user_id)) userSalesProjectsMap.set(r.user_id, []);
            userSalesProjectsMap.get(r.user_id)!.push(r.sales_project_id);
        }
    }

    const mappedUsers = allUsers.map(u => {
        let assignedProjects: string[] = [];
        if (u.role === "sales" || u.role === "leader_sales") {
            assignedProjects = parseProjectIds(u.sales_project_ids, u.sales_project_id);
            const fromJunction = userSalesProjectsMap.get(u.id) || [];
            assignedProjects = [...new Set([...assignedProjects, ...fromJunction])];
        } else {
            assignedProjects = userProjectsMap.get(u.id) || [];
        }

        return {
            ...u,
            job: u.job_id ? { id: u.job_id, name: u.job_name || null } : null,
            project_ids: assignedProjects,
            sales_project_ids: (u.role === "sales" || u.role === "leader_sales") ? assignedProjects : [],
            sales_project_id: (u.role === "sales" || u.role === "leader_sales") ? (assignedProjects[0] || null) : null
        };
    });

    // 6. إرسال النتيجة مع معلومات الـ Pagination الكاملة
    SuccessResponse(res, { 
        Users: mappedUsers,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};

// ✅ Get User By ID
export const getUserById = async (req: Request, res: Response) => {
    const validated = await UserIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 

    const User = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            whatsapp: users.whatsapp,
            image: users.image,
            role: users.role,
            status: users.status, 
            yearly_holidays: users.yearly_holidays,
            zone_id: users.zone_id,
            shift_id: users.shift_id,
            department_id: users.department_id,
            job_id: users.job_id,
            job_name: jobs.name,
            sales_project_id: users.sales_project_id,
            sales_project_ids: users.sales_project_ids,
            used_holidays: sql<number>`(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
            remaining_holidays: sql<number>`IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
        })
        .from(users) 
        .leftJoin(jobs, eq(users.job_id, jobs.id))
        .where(and(eq(users.id, id), validUserRolesCondition))
        .limit(1);

    if (!User[0]) {
        throw new NotFound("User not found");
    }

    const isSalesRole = User[0].role === "sales" || User[0].role === "leader_sales";
    let userProjectIds: string[] = [];
    if (isSalesRole) {
        const spRows = await db
            .select({ sales_project_id: salesProjectUsers.sales_project_id })
            .from(salesProjectUsers)
            .where(eq(salesProjectUsers.user_id, id))
            .catch(() => []);
        userProjectIds = parseProjectIds(User[0].sales_project_ids, User[0].sales_project_id);
        const fromJunction = spRows.map(r => r.sales_project_id).filter((pid): pid is string => Boolean(pid));
        userProjectIds = [...new Set([...userProjectIds, ...fromJunction])];
    } else {
        const pRows = await db
            .select({ project_id: projectUsers.project_id })
            .from(projectUsers)
            .where(eq(projectUsers.user_id, id))
            .catch(() => []);
        userProjectIds = pRows.map(r => r.project_id).filter((pid): pid is string => Boolean(pid));
    }

    const userData = {
        ...User[0],
        job: User[0].job_id ? { id: User[0].job_id, name: User[0].job_name || null } : null,
        project_ids: userProjectIds,
        sales_project_ids: isSalesRole ? userProjectIds : [],
        sales_project_id: isSalesRole ? (userProjectIds[0] || null) : null
    };

    SuccessResponse(res, { User: userData }, 200);
};

// ✅ Get Zones, Shifts, Departments, Jobs and Projects Lists
export const lists = async (req: Request, res: Response) => { 
    try {
        const [zones_list, shifts_list, departments_list, jobs_list, projects_list, sales_projects_list] = await Promise.all([
            db
                .select({
                    id: zones.id,
                    name: zones.name, 
                })
                .from(zones) 
                .where(eq(zones.status, true)),
            
            db
                .select({
                    id: shifts.id,
                    name: shifts.name, 
                    zone_id: shifts.zone_id,
                    days: shifts.days,
                })
                .from(shifts),

            db
                .select({
                    id: departments.id,
                    name: departments.name,
                    zone_id: departments.zone_id,
                })
                .from(departments)
                .where(eq(departments.status, true)),

            db
                .select({
                    id: jobs.id,
                    name: jobs.name,
                })
                .from(jobs)
                .where(eq(jobs.status, true)),

            db
                .select({
                    id: projects.id,
                    name: projects.name,
                    logo: projects.logo,
                })
                .from(projects)
                .catch(() => []),

            db
                .select({
                    id: salesProjects.id,
                    name: salesProjects.name,
                    logo: salesProjects.logo,
                })
                .from(salesProjects)
                .catch(() => [])
        ]); 

        SuccessResponse(res, { 
            zones: zones_list, 
            shifts: shifts_list, 
            departments: departments_list,
            jobs: jobs_list,
            jobs_list: jobs_list,
            projects: projects_list,
            sales_projects: sales_projects_list
        }, 200);

    } catch (error) {
        console.error("Error fetching lists:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ✅ Create User
export const createUser = async (req: Request, res: Response) => {
    const validated = await createUserSchema.parseAsync({ body: req.body });
    const { name, email, password, phone, whatsapp, image, status, yearly_holidays, zone_id, shift_id, department_id, job_id } = validated.body;
    const role = (validated.body as any).role || req.body.role || "engineer";
    
    // تحقق من عدم وجود مستخدم آخر بنفس الـ email أو الـ phone
    const existingUser = await db
        .select()
        .from(users)
        .where(or(eq(users.email, email), eq(users.phone, phone)))
        .limit(1);

    if (existingUser[0]) {
        throw new BadRequest("Email or Phone already exists");
    } 

    // Hash الـ password
    const hashedPassword = await bcrypt.hash(password, 10);

    let savedUserImage: string | null = null; 

    if (req.file) {
        savedUserImage = getFileUrl(req, req.file, "Users");
    } else if (image && typeof image === "string" && image.startsWith("data:")) {
        const result = await saveBase64Image(req, image, "Users");
        savedUserImage = result.url;
    } else if (typeof image === "string" && image && image !== "null" && image !== "undefined") {
        savedUserImage = image;
    }

    const userId = uuidv4();
    let salesProjectIds: string[] = [];
    let engineerProjectIds: string[] = [];

    if (role === "sales" || role === "leader_sales") {
        salesProjectIds = parseProjectIds(req.body.sales_project_ids || req.body.project_ids, req.body.sales_project_id || req.body.project_id);
    } else {
        engineerProjectIds = parseProjectIds(req.body.project_ids, req.body.project_id);
    }

    await db.insert(users).values({
        id: userId,
        name,
        email,
        phone,
        whatsapp: whatsapp || null,
        image: savedUserImage,
        vector_image_array: validated.body.vector_image_array || null,
        password: hashedPassword,
        status: status, 
        role: role,
        yearly_holidays: yearly_holidays ?? false,
        zone_id: zone_id || null,
        shift_id: shift_id || null,
        department_id: department_id || null,
        job_id: job_id || null,
        sales_project_id: (role === "sales" || role === "leader_sales") ? (salesProjectIds[0] || null) : null,
        sales_project_ids: (role === "sales" || role === "leader_sales") ? salesProjectIds : null,
    });

    if (role === "sales" || role === "leader_sales") {
        await syncSalesProjectUsers(userId, salesProjectIds);
    } else {
        await syncProjectUsers(userId, engineerProjectIds);
    }

    SuccessResponse(res, { message: "User created successfully", id: userId }, 201);
};

// ✅ Update User
export const updateUser = async (req: Request, res: Response) => {
    const validated = await updateUserSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { name, email, password, phone, whatsapp, image, status, yearly_holidays, zone_id, shift_id, department_id, job_id } = validated.body;
  
    // تحقق من وجود الـ User بالـ roles الصحيحة
    const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), validUserRolesCondition))
        .limit(1);

    if (!existingUser[0]) {
        throw new NotFound("User not found");
    }

    // تحقق من الـ email لو تم تعديله ولم يكرر مع حساب آخر
    if (email && email !== existingUser[0].email) {
        const duplicateEmail = await db
            .select()
            .from(users)
            .where(and(eq(users.email, email), ne(users.id, id)))
            .limit(1);

        if (duplicateEmail[0]) {
            throw new BadRequest("Email already exists");
        }
    } 

    // تحقق من الـ phone لو تم تعديله ولم يكرر مع حساب آخر
    if (phone && phone !== existingUser[0].phone) {
        const duplicatePhone = await db
            .select()
            .from(users)
            .where(and(eq(users.phone, phone), ne(users.id, id)))
            .limit(1);

        if (duplicatePhone[0]) {
            throw new BadRequest("Phone already exists");
        }
    }

    let UserImage = existingUser[0].image;

    if (req.file) {
        UserImage = getFileUrl(req, req.file, "Users");
        if (existingUser[0].image) {
            await deletePhotoFromServer(existingUser[0].image);
        }
    } else if (image !== undefined) {
        if (image && typeof image === "string" && image.startsWith("data:")) {
            const result = await saveBase64Image(req, image, "Users");
            if (existingUser[0].image) {
                await deletePhotoFromServer(existingUser[0].image);
            }
            UserImage = result.url;
        } else if (image === "" || image === null || image === "null") {
            if (existingUser[0].image) {
                await deletePhotoFromServer(existingUser[0].image);
            }
            UserImage = null;
        }
    }

    // بناء كائن التحديث بشكل يحافظ على البيانات الحالية في حال عدم إرسالها
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp || null;
    if (status !== undefined) updateData.status = status;
    if (UserImage !== undefined) updateData.image = UserImage;
    if (validated.body.vector_image_array !== undefined) {
        updateData.vector_image_array = validated.body.vector_image_array || null;
    }
    if (yearly_holidays !== undefined) updateData.yearly_holidays = yearly_holidays;
    if (zone_id !== undefined) updateData.zone_id = zone_id || null;
    if (shift_id !== undefined) updateData.shift_id = shift_id || null;
    if (department_id !== undefined) updateData.department_id = department_id || null;
    if (job_id !== undefined) updateData.job_id = job_id || null;
    const effectiveRole = (validated.body as any).role || req.body.role || existingUser[0].role;
    if ((validated.body as any).role !== undefined || req.body.role !== undefined) {
        updateData.role = effectiveRole;
    }

    const hasProjectUpdates = 
        req.body.project_ids !== undefined || 
        req.body.project_id !== undefined || 
        req.body.sales_project_ids !== undefined || 
        req.body.sales_project_id !== undefined;

    if (hasProjectUpdates) {
        if (effectiveRole === "sales" || effectiveRole === "leader_sales") {
            const salesProjectIds = parseProjectIds(
                req.body.sales_project_ids || req.body.project_ids, 
                req.body.sales_project_id || req.body.project_id
            );
            updateData.sales_project_ids = salesProjectIds;
            updateData.sales_project_id = salesProjectIds[0] || null;
            await syncSalesProjectUsers(id, salesProjectIds);
        } else {
            const engineerProjectIds = parseProjectIds(req.body.project_ids, req.body.project_id);
            await syncProjectUsers(id, engineerProjectIds);
        }
    }

    // لو فيه password جديد
    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    SuccessResponse(res, { message: "User updated successfully" }, 200);
};

// ✅ Delete User
export const deleteUser = async (req: Request, res: Response) => {
    const validated = await UserIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), validUserRolesCondition))
        .limit(1);

    if (!existingUser[0]) {
        throw new NotFound("User not found");
    }

    // التحقق مما إذا كان المستخدم مديراً لأي قسم
    const managedDept = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.manager_id, id))
        .limit(1);

    if (managedDept[0]) {
        throw new BadRequest(`Cannot delete user because they are the manager of department "${managedDept[0].name}". Please reassign the department manager first.`);
    }

    // حذف جميع السجلات المرتبطة بالمستخدم ضمن Transaction لتجنب أخطاء Foreign Key Constraints
    await db.transaction(async (tx) => {
        // 1. حذف سجلات الموظف التابعة له مباشرة
        await tx.delete(attendance).where(eq(attendance.userId, id));
        await tx.delete(bonuses).where(eq(bonuses.userId, id));
        await tx.delete(deductions).where(eq(deductions.userId, id));
        await tx.delete(holidayRequests).where(eq(holidayRequests.userId, id));
        await tx.delete(onlineRequests).where(eq(onlineRequests.userId, id));
        await tx.delete(permissions).where(eq(permissions.userId, id));
        await tx.delete(salaries).where(eq(salaries.user_id, id));
        await tx.delete(groupUsers).where(eq(groupUsers.user_id, id));
        await tx.delete(projectUsers).where(eq(projectUsers.user_id, id));
        await tx.delete(salesProjectUsers).where(eq(salesProjectUsers.user_id, id));

        // 2. فك ارتباط المستخدم بالمهام والمشاريع والملاحظات
        await tx.update(tasks).set({ user_id: null }).where(eq(tasks.user_id, id));
        await tx.update(projects).set({ tester_id: null }).where(eq(projects.tester_id, id));
        await tx.update(notesBoard).set({ user_id: null }).where(eq(notesBoard.user_id, id));
        await tx.update(taskVoices).set({ user_id: null }).where(eq(taskVoices.user_id, id));

        // 3. حذف المستخدم
        await tx.delete(users).where(eq(users.id, id));
    });

    // حذف الصورة من السيرفر بعد نجاح الحذف من قاعدة البيانات
    if (existingUser[0].image) {
        await deletePhotoFromServer(existingUser[0].image);
    }

    SuccessResponse(res, { message: "User deleted successfully" }, 200);
};

// ✅ Get User Attendance Report
export const getUserAttendanceReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pad = (num: number) => num.toString().padStart(2, '0');
        let from = req.query.from as string;
        let to = req.query.to as string;

        if (!from && !to && req.query.month && req.query.year) {
            const month = parseInt(req.query.month as string, 10);
            const year = parseInt(req.query.year as string, 10);
            if (!isNaN(month) && !isNaN(year) && month >= 1 && month <= 12) {
                const lastDay = new Date(year, month, 0).getDate();
                from = `${year}-${pad(month)}-01`;
                to = `${year}-${pad(month)}-${pad(lastDay)}`;
            }
        }

        if (!from || !to) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const lastDay = new Date(year, month, 0).getDate();
            if (!from) from = `${year}-${pad(month)}-01`;
            if (!to) to = `${year}-${pad(month)}-${pad(lastDay)}`;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const data = await calculateAttendanceReport(id, from, to, page, limit);
        SuccessResponse(res, data, 200);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
export const getUsersSelectionList = async (req: Request, res: Response) => {
    try {
        const withoutSalary = req.query.withoutSalary === 'true';

        let conditions: any[] = [
            eq(users.status, "active"),
            or(
                eq(users.role, "engineer"),
                eq(users.role, "leader_sales")
            )
        ];

        if (withoutSalary) {
            conditions.push(
                sql`${users.id} NOT IN (SELECT user_id FROM salaries)`
            );
        }

        const selectionList = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(and(...conditions));
        
        SuccessResponse(res, { Users: selectionList }, 200);
    } catch (error) {
        console.error("Error fetching users selection list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

