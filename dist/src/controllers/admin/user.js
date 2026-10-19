"use strict";
// src/controllers/User/UserController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersSelectionList = exports.getUserAttendanceReport = exports.deleteUser = exports.updateUser = exports.createUser = exports.lists = exports.getUserById = exports.getAllUser = exports.UserIdSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const attendanceService_1 = require("../../services/attendanceService");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
const upload_1 = require("../../middlewares/upload");
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
        whatsapp: zod_1.z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), zod_1.z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()),
        password: zod_1.z.string({ required_error: "Password is required" })
            .min(6, "Password must be at least 6 characters"),
        image: zod_1.z.any().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"], {
            required_error: "Status is required",
            invalid_type_error: "Status must be either 'active' or 'inactive'",
        }),
        yearly_holidays: zod_1.z.preprocess((val) => {
            if (val === "true" || val === true)
                return true;
            if (val === "false" || val === false)
                return false;
            return val;
        }, zod_1.z.boolean().optional()),
        zone_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Zone ID format").optional().nullable()),
        shift_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Shift ID format").optional().nullable()),
        department_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Department ID format").optional().nullable()),
        vector_image_array: zod_1.z.preprocess((val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                }
                catch { }
            }
            return val;
        }, zod_1.z.array(zod_1.z.number()).nullable().optional()),
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
        whatsapp: zod_1.z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : val), zod_1.z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()),
        password: zod_1.z.string().min(6, "Password must be at least 6 characters").optional(),
        image: zod_1.z.any().nullable().optional(),
        status: zod_1.z.enum(["active", "inactive"]).optional(),
        yearly_holidays: zod_1.z.preprocess((val) => {
            if (val === "true" || val === true)
                return true;
            if (val === "false" || val === false)
                return false;
            return val;
        }, zod_1.z.boolean().optional()),
        zone_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Zone ID format").optional().nullable()),
        shift_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Shift ID format").optional().nullable()),
        department_id: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().uuid("Invalid Department ID format").optional().nullable()),
        vector_image_array: zod_1.z.preprocess((val) => {
            if (typeof val === "string") {
                try {
                    return JSON.parse(val);
                }
                catch { }
            }
            return val;
        }, zod_1.z.array(zod_1.z.number()).nullable().optional()),
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
        whereConditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.users.name, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.phone, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.whatsapp, searchPattern), (0, drizzle_orm_1.like)(schema_1.users.email, searchPattern)));
    }
    // 3. بناء استعلام البيانات الأساسي (Base Query)
    let query = db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        whatsapp: schema_1.users.whatsapp,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        yearly_holidays: schema_1.users.yearly_holidays,
        zone_id: schema_1.users.zone_id,
        shift_id: schema_1.users.shift_id,
        department_id: schema_1.users.department_id,
        createdAt: schema_1.users.createdAt,
        delay_tasks: (0, drizzle_orm_1.sql) `(SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.delivery_date < CURRENT_DATE() AND tasks.status != 'approve')`.as('delay_tasks'),
        progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'approve') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('progress'),
        done_progress: (0, drizzle_orm_1.sql) `IFNULL((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id AND tasks.status = 'done') / NULLIF((SELECT COUNT(*) FROM tasks WHERE tasks.user_id = users.id), 0) * 100, 0)`.as('done_progress'),
        used_holidays: (0, drizzle_orm_1.sql) `(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
        remaining_holidays: (0, drizzle_orm_1.sql) `IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
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
        whatsapp: schema_1.users.whatsapp,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        yearly_holidays: schema_1.users.yearly_holidays,
        zone_id: schema_1.users.zone_id,
        shift_id: schema_1.users.shift_id,
        department_id: schema_1.users.department_id,
        used_holidays: (0, drizzle_orm_1.sql) `(SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve')`.as('used_holidays'),
        remaining_holidays: (0, drizzle_orm_1.sql) `IF(users.yearly_holidays = 1, ROUND(IFNULL((SELECT yearly_holidays FROM settings LIMIT 1), 0) * IF(YEAR(users.created_at) = YEAR(CURDATE()), (12 - MONTH(users.created_at) + 1) / 12.0, 1.0)) - (SELECT COUNT(*) FROM holiday_requests WHERE holiday_requests.user_id = users.id AND holiday_requests.status = 'approve'), 0)`.as('remaining_holidays')
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
// ✅ Get Zones and Shifts Lists
const lists = async (req, res) => {
    try {
        // استخدام Promise.all لتشغيل الاستعلامين في نفس الوقت
        const [zones_list, shifts_list, departments_list] = await Promise.all([
            db_1.db
                .select({
                id: schema_1.zones.id,
                name: schema_1.zones.name,
            })
                .from(schema_1.zones)
                .where((0, drizzle_orm_1.eq)(schema_1.zones.status, true)),
            db_1.db
                .select({
                id: schema_1.shifts.id,
                name: schema_1.shifts.name,
                zone_id: schema_1.shifts.zone_id,
            })
                .from(schema_1.shifts),
            db_1.db
                .select({
                id: schema_1.departments.id,
                name: schema_1.departments.name,
                zone_id: schema_1.departments.zone_id,
            })
                .from(schema_1.departments)
                .where((0, drizzle_orm_1.eq)(schema_1.departments.status, true))
        ]);
        (0, response_1.SuccessResponse)(res, { zones: zones_list, shifts: shifts_list, departments: departments_list }, 200);
    }
    catch (error) {
        console.error("Error fetching lists:", error);
        // تأكد من وجود دالة مخصصة للأخطاء أو استخدم الرد الافتراضي
        // ErrorResponse(res, "حدث خطأ أثناء جلب البيانات", 500);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.lists = lists;
// ✅ Create User
const createUser = async (req, res) => {
    const validated = await exports.createUserSchema.parseAsync({ body: req.body });
    const { name, email, password, phone, whatsapp, image, status, yearly_holidays, zone_id, shift_id, department_id } = validated.body;
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
    if (req.file) {
        savedUserImage = (0, upload_1.getFileUrl)(req, req.file, "Users");
    }
    else if (image && typeof image === "string" && image.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, image, "Users");
        savedUserImage = result.url;
    }
    else if (typeof image === "string" && image && image !== "null" && image !== "undefined") {
        savedUserImage = image;
    }
    await db_1.db.insert(schema_1.users).values({
        name,
        email,
        phone,
        whatsapp: whatsapp || null,
        image: savedUserImage,
        vector_image_array: validated.body.vector_image_array || null,
        password: hashedPassword,
        status: status,
        role: "engineer",
        yearly_holidays: yearly_holidays ?? false,
        zone_id: zone_id || null,
        shift_id: shift_id || null,
        department_id: department_id || null,
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
    const { name, email, password, phone, whatsapp, image, status, yearly_holidays, zone_id, shift_id, department_id } = validated.body;
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
    if (req.file) {
        UserImage = (0, upload_1.getFileUrl)(req, req.file, "Users");
        if (existingUser[0].image) {
            await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
        }
    }
    else if (image !== undefined) {
        if (image && typeof image === "string" && image.startsWith("data:")) {
            const result = await (0, handleImages_1.saveBase64Image)(req, image, "Users");
            if (existingUser[0].image) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
            }
            UserImage = result.url;
        }
        else if (image === "" || image === null || image === "null") {
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
    if (whatsapp !== undefined)
        updateData.whatsapp = whatsapp || null;
    if (status !== undefined)
        updateData.status = status;
    if (UserImage !== undefined)
        updateData.image = UserImage;
    if (validated.body.vector_image_array !== undefined) {
        updateData.vector_image_array = validated.body.vector_image_array || null;
    }
    if (yearly_holidays !== undefined)
        updateData.yearly_holidays = yearly_holidays;
    if (zone_id !== undefined)
        updateData.zone_id = zone_id || null;
    if (shift_id !== undefined)
        updateData.shift_id = shift_id || null;
    if (department_id !== undefined)
        updateData.department_id = department_id || null;
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
    // التحقق مما إذا كان المستخدم مديراً لأي قسم
    const managedDept = await db_1.db
        .select({ id: schema_1.departments.id, name: schema_1.departments.name })
        .from(schema_1.departments)
        .where((0, drizzle_orm_1.eq)(schema_1.departments.manager_id, id))
        .limit(1);
    if (managedDept[0]) {
        throw new BadRequest_1.BadRequest(`Cannot delete user because they are the manager of department "${managedDept[0].name}". Please reassign the department manager first.`);
    }
    // حذف جميع السجلات المرتبطة بالمستخدم ضمن Transaction لتجنب أخطاء Foreign Key Constraints
    await db_1.db.transaction(async (tx) => {
        // 1. حذف سجلات الموظف التابعة له مباشرة
        await tx.delete(schema_1.attendance).where((0, drizzle_orm_1.eq)(schema_1.attendance.userId, id));
        await tx.delete(schema_1.bonuses).where((0, drizzle_orm_1.eq)(schema_1.bonuses.userId, id));
        await tx.delete(schema_1.deductions).where((0, drizzle_orm_1.eq)(schema_1.deductions.userId, id));
        await tx.delete(schema_1.holidayRequests).where((0, drizzle_orm_1.eq)(schema_1.holidayRequests.userId, id));
        await tx.delete(schema_1.onlineRequests).where((0, drizzle_orm_1.eq)(schema_1.onlineRequests.userId, id));
        await tx.delete(schema_1.permissions).where((0, drizzle_orm_1.eq)(schema_1.permissions.userId, id));
        await tx.delete(schema_1.salaries).where((0, drizzle_orm_1.eq)(schema_1.salaries.user_id, id));
        await tx.delete(schema_1.groupUsers).where((0, drizzle_orm_1.eq)(schema_1.groupUsers.user_id, id));
        await tx.delete(schema_1.projectUsers).where((0, drizzle_orm_1.eq)(schema_1.projectUsers.user_id, id));
        // 2. فك ارتباط المستخدم بالمهام والمشاريع والملاحظات
        await tx.update(schema_1.tasks).set({ user_id: null }).where((0, drizzle_orm_1.eq)(schema_1.tasks.user_id, id));
        await tx.update(schema_1.projects).set({ tester_id: null }).where((0, drizzle_orm_1.eq)(schema_1.projects.tester_id, id));
        await tx.update(schema_1.notesBoard).set({ user_id: null }).where((0, drizzle_orm_1.eq)(schema_1.notesBoard.user_id, id));
        await tx.update(schema_1.taskVoices).set({ user_id: null }).where((0, drizzle_orm_1.eq)(schema_1.taskVoices.user_id, id));
        // 3. حذف المستخدم
        await tx.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id));
    });
    // حذف الصورة من السيرفر بعد نجاح الحذف من قاعدة البيانات
    if (existingUser[0].image) {
        await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
    }
    (0, response_1.SuccessResponse)(res, { message: "User deleted successfully" }, 200);
};
exports.deleteUser = deleteUser;
// ✅ Get User Attendance Report
const getUserAttendanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const from = req.query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        const to = req.query.to || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const data = await (0, attendanceService_1.calculateAttendanceReport)(id, from, to, page, limit);
        (0, response_1.SuccessResponse)(res, data, 200);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getUserAttendanceReport = getUserAttendanceReport;
const getUsersSelectionList = async (req, res) => {
    try {
        const withoutSalary = req.query.withoutSalary === 'true';
        let conditions = [
            (0, drizzle_orm_1.eq)(schema_1.users.status, "active"),
            (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "tester"), (0, drizzle_orm_1.eq)(schema_1.users.role, "engineer"))
        ];
        if (withoutSalary) {
            conditions.push((0, drizzle_orm_1.sql) `${schema_1.users.id} NOT IN (SELECT user_id FROM salaries)`);
        }
        const selectionList = await db_1.db
            .select({ id: schema_1.users.id, name: schema_1.users.name })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)(...conditions));
        (0, response_1.SuccessResponse)(res, { Users: selectionList }, 200);
    }
    catch (error) {
        console.error("Error fetching users selection list:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getUsersSelectionList = getUsersSelectionList;
