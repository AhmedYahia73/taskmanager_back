// src/controllers/User/UserController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, shifts, zones } from "../../models/schema"; 
import { SQL, and, or, eq, like, count, desc, ne, sql } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { calculateAttendanceReport } from "../../services/attendanceService";
import { NotFound } from "../../Errors/NotFound";
import { BadRequest } from "../../Errors/BadRequest";
import bcrypt from "bcrypt";
import { saveBase64Image } from "../../utils/handleImages";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import { z } from "zod";

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
    
    password: z.string({ required_error: "Password is required" })
      .min(6, "Password must be at least 6 characters"),
    
    image: z.string().nullable().optional(),

    status: z.enum(["active", "inactive"], {
      required_error: "Status is required",
      invalid_type_error: "Status must be either 'active' or 'inactive'",
    }),

    role: z.enum(["tester", "engineer"], {
      required_error: "Role is required",
      invalid_type_error: "Role must be either 'tester' or 'engineer'",
    }),
    yearly_holidays: z.boolean().optional(),
    zone_id: z.string({ required_error: "Zone is required" }).uuid("Invalid Zone ID format").optional(),
    shift_id: z.string({ required_error: "Shift is required" }).uuid("Invalid Shift ID format").optional(),
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
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    image: z.string().nullable().optional(),
    status: z.enum(["active", "inactive"]).optional(),
    role: z.enum(["tester", "engineer"]).optional(),
    yearly_holidays: z.boolean().optional(),
    zone_id: z.string().uuid("Invalid Zone ID format").optional(),
    shift_id: z.string().uuid("Invalid Shift ID format").optional(),
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

// شرط الفلترة الموحد للتحقق من الأدوار المقبولة (tester / engineer)
const validUserRolesCondition = or(eq(users.role, "tester"), eq(users.role, "engineer"));

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
    if (role && (role === "tester" || role === "engineer")) {
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
            image: users.image,
            role: users.role,
            status: users.status, 
            yearly_holidays: users.yearly_holidays,
            zone_id: users.zone_id,
            shift_id: users.shift_id,
            createdAt: users.createdAt,
            delay_tasks: sql<number>`(SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.delivery_date < NOW() AND tasks.status != 'approve')`.as('delay_tasks'),
            progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('progress'),
            done_progress: sql<number>`IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('done_progress'),
            used_holidays: sql<number>`(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
            remaining_holidays: sql<number>`IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
        })
        .from(users)
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

    // 6. إرسال النتيجة مع معلومات الـ Pagination الكاملة
    SuccessResponse(res, { 
        Users: allUsers,
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
            image: users.image,
            role: users.role,
            status: users.status, 
            yearly_holidays: users.yearly_holidays,
            zone_id: users.zone_id,
            shift_id: users.shift_id,
            used_holidays: sql<number>`(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
            remaining_holidays: sql<number>`IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
        })
        .from(users) 
        .where(and(eq(users.id, id), validUserRolesCondition))
        .limit(1);

    if (!User[0]) {
        throw new NotFound("User not found");
    }

    SuccessResponse(res, { User: User[0] }, 200);
};
// ✅ Get Zones and Shifts Lists
export const lists = async (req: Request, res: Response) => { 
    try {
        // استخدام Promise.all لتشغيل الاستعلامين في نفس الوقت
        const [zones_list, shifts_list] = await Promise.all([
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
                })
                .from(shifts)
        ]); 

        SuccessResponse(res, { zones_list, shifts_list }, 200);

    } catch (error) {
        console.error("Error fetching lists:", error);
        // تأكد من وجود دالة مخصصة للأخطاء أو استخدم الرد الافتراضي
        // ErrorResponse(res, "حدث خطأ أثناء جلب البيانات", 500);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ✅ Create User
export const createUser = async (req: Request, res: Response) => {
    const validated = await createUserSchema.parseAsync({ body: req.body });
    const { name, email, password, phone, image, status, role, yearly_holidays, zone_id, shift_id } = validated.body;
    
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

    if (image) {
        const result = await saveBase64Image(req, image, "Users");
        savedUserImage = result.url;
    }

    await db.insert(users).values({
        name,
        email,
        phone,
        image: savedUserImage,
        password: hashedPassword,
        status: status, 
        role: role,
        yearly_holidays: yearly_holidays ?? false,
        zone_id: zone_id || null,
        shift_id: shift_id || null,
    });

    SuccessResponse(res, { message: "User created successfully" }, 201);
};

// ✅ Update User
export const updateUser = async (req: Request, res: Response) => {
    const validated = await updateUserSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { name, email, password, phone, image, status, role, yearly_holidays, zone_id, shift_id } = validated.body;
  
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

    if (image !== undefined) {
        if (image) {
            const result = await saveBase64Image(req, image, "Users");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingUser[0].image) {
                await deletePhotoFromServer(existingUser[0].image);
            }
            UserImage = result.url;
        } else {
            // حذف الصورة القديمة وتصفير الحقل إذا تم إرسال قيمة فارغة (null)
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
    if (status !== undefined) updateData.status = status;
    if (image !== undefined) updateData.image = UserImage;
    if (role !== undefined) updateData.role = role;
    if (yearly_holidays !== undefined) updateData.yearly_holidays = yearly_holidays;
    if (zone_id !== undefined) updateData.zone_id = zone_id || null;
    if (shift_id !== undefined) updateData.shift_id = shift_id || null;

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

    // حذف الصورة من السيرفر قبل مسح الحساب
    if (existingUser[0].image) {
        await deletePhotoFromServer(existingUser[0].image);
    }

    await db.delete(users).where(eq(users.id, id));

    SuccessResponse(res, { message: "User deleted successfully" }, 200);
};

// ✅ Get User Attendance Report
export const getUserAttendanceReport = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const from = (req.query.from as string) || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = (req.query.to as string) || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
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
        const selectionList = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
            and(
                eq(users.status, "active"),
                or(
                    eq(users.role, "tester"),
                    eq(users.role, "engineer")
                )
            )
        );
        SuccessResponse(res, { Users: selectionList }, 200);
    } catch (error) {
        console.error("Error fetching users selection list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

