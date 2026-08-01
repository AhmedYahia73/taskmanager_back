"use strict";
// src/controllers/User/UserController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUser = exports.UserIdSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
const zod_1 = require("zod");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
// الـ Schema الخاص بإنشاء مسؤول (User) جديد
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string({ required_error: "Name is required" })
            .min(1, "Name cannot be empty")
            .max(200, "Name cannot exceed 200 characters"),
        email: zod_1.z.string({ required_error: "Email is required" })
            .email("Invalid email format")
            .max(100, "Email cannot exceed 100 characters"),
        phone: zod_1.z.string({ required_error: "Phone is required" })
            .min(5, "Phone is too short")
            .max(20, "Phone cannot exceed 20 characters"),
        password: zod_1.z.string({ required_error: "Password is required" })
            .min(6, "Password must be at least 6 characters"),
        image: zod_1.z.string().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"], {
            required_error: "Status is required",
            invalid_type_error: "Status must be either 'active' or 'inactive'",
        }),
        role: zod_1.z.enum(["tester", "engineer"], {
            required_error: "Role is required",
            invalid_type_error: "Role must be either 'tester' or 'engineer'",
        }),
        yearly_holidays: zod_1.z.boolean().optional(),
    }),
});
// الـ Schema الخاص بتحديث مسؤول (User)
exports.updateUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid User ID format"),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, "Name cannot be empty").max(200).optional(),
        email: zod_1.z.string().email("Invalid email format").max(100).optional(),
        phone: zod_1.z.string().min(5).max(20).optional(),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters").optional(),
        image: zod_1.z.string().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"]).optional(),
        role: zod_1.z.enum(["tester", "engineer"]).optional(),
        yearly_holidays: zod_1.z.boolean().optional(),
    }),
});
// الـ Schema للعمليات التي تتطلب المعرف ID فقط في الـ parameters
exports.UserIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "ID is required" }).uuid("Invalid User ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// شرط الفلترة الموحد للتحقق من الأدوار المقبولة (tester / engineer)
const validUserRolesCondition = (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "tester"), (0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"));
// ✅ Get All Users
const getAllUser = async (req, res) => {
    // استقبال معايير الـ Pagination والبحث
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role?.trim() || '';
    const offset = (page - 1) * limit;
    let whereConditions = [];
    // 1. الفلترة الأساسية: جلب المستخدمين بناء على دور معين لو اتبعث في الطلب
    if (role && (role === "tester" || role === "engineer")) {
        whereConditions.push((0, drizzle_orm_1.eq)(schema_1.users.role, role));
    }
    else {
        whereConditions.push(validUserRolesCondition);
    }
    // 2. تطبيق البحث (Search) بالاسم، الهاتف، أو البريد الإلكتروني
    if (search) {
        const searchPattern = `%${search}%`;
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.users.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.email, searchPattern)));
    }
    // 3. بناء استعلام البيانات الأساسي (Base Query)
    let query = db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        yearly_holidays: schema_1.users.yearly_holidays,
        createdAt: schema_1.users.createdAt,
        delay_tasks: (0, drizzle_orm_1.sql) `(SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.delivery_date < NOW() AND tasks.status != 'approve')`.as('delay_tasks'),
        progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('progress'),
        done_progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('done_progress')
    })
        .from(schema_1.users)
        .orderBy((0, drizzle_orm_1.desc)(schema_1.users.createdAt)) // ترتيب الأحدث أولاً
        .$dynamic();
    // 4. بناء استعلام الـ Count لحساب العدد الإجمالي متوافقاً مع فلاتر البحث
    let countQuery = db_1.db
        .select({ total: (0, drizzle_orm_1.count)() })
        .from(schema_1.users)
        .$dynamic();
    // ربط الشروط بالاستعلامات
    if (whereConditions.length > 0) {
        query = query.where((0, drizzle_orm_1.and)(...whereConditions));
        countQuery = countQuery.where((0, drizzle_orm_1.and)(...whereConditions));
    }
    // 5. تنفيذ الاستعلامين بالتوازي (Parallel Execution)
    const [allUsers, [{ total: totalCount }]] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery
    ]);
    // 6. إرسال النتيجة مع معلومات الـ Pagination الكاملة
    (0, response_1.SuccessResponse)(res, {
        Users: allUsers,
        pagination: {
            total: totalCount,
            page,
            limit,
            totalPages: Math.ceil(totalCount / limit)
        }
    }, 200);
};
exports.getAllUser = getAllUser;
// ✅ Get User By ID
const getUserById = async (req, res) => {
    const validated = await exports.UserIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const User = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        yearly_holidays: schema_1.users.yearly_holidays,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), validUserRolesCondition))
        .limit(1);
    if (!User[0]) {
        throw new NotFound_1.NotFound("User not found");
    }
    (0, response_1.SuccessResponse)(res, { User: User[0] }, 200);
};
exports.getUserById = getUserById;
// ✅ Create User
const createUser = async (req, res) => {
    const validated = await exports.createUserSchema.parseAsync({ body: req.body });
    const { name, email, password, phone, image, status, role, yearly_holidays } = validated.body;
    // تحقق من عدم وجود مستخدم آخر بنفس الـ email أو الـ phone
    const existingUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.email, email), (0, drizzle_orm_1.eq)(schema_1.users.phone, phone)))
        .limit(1);
    if (existingUser[0]) {
        throw new BadRequest_1.BadRequest("Email or Phone already exists");
    }
    // Hash الـ password
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    let savedUserImage = null;
    if (image) {
        const result = await (0, handleImages_1.saveBase64Image)(req, image, "Users");
        savedUserImage = result.url;
    }
    await db_1.db.insert(schema_1.users).values({
        name,
        email,
        phone,
        image: savedUserImage,
        password: hashedPassword,
        status: status,
        role: role,
        yearly_holidays: yearly_holidays ?? false,
    });
    (0, response_1.SuccessResponse)(res, { message: "User created successfully" }, 201);
};
exports.createUser = createUser;
// ✅ Update User
const updateUser = async (req, res) => {
    const validated = await exports.updateUserSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { name, email, password, phone, image, status, role, yearly_holidays } = validated.body;
    // تحقق من وجود الـ User بالـ roles الصحيحة
    const existingUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), validUserRolesCondition))
        .limit(1);
    if (!existingUser[0]) {
        throw new NotFound_1.NotFound("User not found");
    }
    // تحقق من الـ email لو تم تعديله ولم يكرر مع حساب آخر
    if (email && email !== existingUser[0].email) {
        const duplicateEmail = await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.email, email), (0, drizzle_orm_1.ne)(schema_1.users.id, id)))
            .limit(1);
        if (duplicateEmail[0]) {
            throw new BadRequest_1.BadRequest("Email already exists");
        }
    }
    // تحقق من الـ phone لو تم تعديله ولم يكرر مع حساب آخر
    if (phone && phone !== existingUser[0].phone) {
        const duplicatePhone = await db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.phone, phone), (0, drizzle_orm_1.ne)(schema_1.users.id, id)))
            .limit(1);
        if (duplicatePhone[0]) {
            throw new BadRequest_1.BadRequest("Phone already exists");
        }
    }
    let UserImage = existingUser[0].image;
    if (image !== undefined) {
        if (image) {
            const result = await (0, handleImages_1.saveBase64Image)(req, image, "Users");
            // حذف الصورة القديمة من السيرفر بعد رفع الجديدة بنجاح
            if (existingUser[0].image) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
            }
            UserImage = result.url;
        }
        else {
            // حذف الصورة القديمة وتصفير الحقل إذا تم إرسال قيمة فارغة (null)
            if (existingUser[0].image) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
            }
            UserImage = null;
        }
    }
    // بناء كائن التحديث بشكل يحافظ على البيانات الحالية في حال عدم إرسالها
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (email !== undefined)
        updateData.email = email;
    if (phone !== undefined)
        updateData.phone = phone;
    if (status !== undefined)
        updateData.status = status;
    if (image !== undefined)
        updateData.image = UserImage;
    if (role !== undefined)
        updateData.role = role;
    if (yearly_holidays !== undefined)
        updateData.yearly_holidays = yearly_holidays;
    // لو فيه password جديد
    if (password) {
        updateData.password = await bcrypt_1.default.hash(password, 10);
    }
    await db_1.db.update(schema_1.users).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    (0, response_1.SuccessResponse)(res, { message: "User updated successfully" }, 200);
};
exports.updateUser = updateUser;
// ✅ Delete User
const deleteUser = async (req, res) => {
    const validated = await exports.UserIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.id, id), validUserRolesCondition))
        .limit(1);
    if (!existingUser[0]) {
        throw new NotFound_1.NotFound("User not found");
    }
    // حذف الصورة من السيرفر قبل مسح الحساب
    if (existingUser[0].image) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
    }
    await db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    (0, response_1.SuccessResponse)(res, { message: "User deleted successfully" }, 200);
};
exports.deleteUser = deleteUser;
