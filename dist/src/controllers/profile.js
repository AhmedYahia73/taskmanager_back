"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const drizzle_orm_1 = require("drizzle-orm");
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const Errors_1 = require("../Errors");
const response_1 = require("../utils/response");
const deleteImage_1 = require("../utils/deleteImage");
const handleImages_1 = require("../utils/handleImages");
const upload_1 = require("../middlewares/upload");
const auth_1 = require("../utils/auth");
// Validation schema for profile update
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.preprocess((val) => (typeof val === "string" ? val.trim() : val), zod_1.z.string().min(1, "Name cannot be empty").max(200, "Name cannot exceed 200 characters").optional()),
        email: zod_1.z.preprocess((val) => (typeof val === "string" ? val.trim().toLowerCase() : val), zod_1.z.string().email("Invalid email format").max(100, "Email cannot exceed 100 characters").optional()),
        phone: zod_1.z.preprocess((val) => (typeof val === "string" ? val.trim() : val), zod_1.z.string().min(5, "Phone is too short").max(20, "Phone cannot exceed 20 characters").optional()),
        whatsapp: zod_1.z.preprocess((val) => (val === "" || val === "null" || val === "undefined" ? null : typeof val === "string" ? val.trim() : val), zod_1.z.string().max(20, "WhatsApp number cannot exceed 20 characters").optional().nullable()),
        password: zod_1.z.preprocess((val) => (typeof val === "string" && val.trim() === "" ? undefined : val), zod_1.z.string().min(7, "Password must be at least 7 characters").max(255).optional().nullable()),
        image: zod_1.z.any().nullable().optional(),
    }),
});
// ✅ Get Current User Profile
const getProfile = async (req, res) => {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
        throw new Errors_1.UnauthorizedError("Authentication required");
    }
    const userRecord = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        whatsapp: schema_1.users.whatsapp,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        points: schema_1.users.points,
        yearly_holidays: schema_1.users.yearly_holidays,
        zone_id: schema_1.users.zone_id,
        zone_name: schema_1.zones.name,
        shift_id: schema_1.users.shift_id,
        shift_name: schema_1.shifts.name,
        department_id: schema_1.users.department_id,
        department_name: schema_1.departments.name,
        job_id: schema_1.users.job_id,
        job_name: schema_1.jobs.name,
        createdAt: schema_1.users.createdAt,
        updatedAt: schema_1.users.updatedAt,
    })
        .from(schema_1.users)
        .leftJoin(schema_1.zones, (0, drizzle_orm_1.eq)(schema_1.users.zone_id, schema_1.zones.id))
        .leftJoin(schema_1.shifts, (0, drizzle_orm_1.eq)(schema_1.users.shift_id, schema_1.shifts.id))
        .leftJoin(schema_1.departments, (0, drizzle_orm_1.eq)(schema_1.users.department_id, schema_1.departments.id))
        .leftJoin(schema_1.jobs, (0, drizzle_orm_1.eq)(schema_1.users.job_id, schema_1.jobs.id))
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, currentUserId))
        .limit(1);
    if (!userRecord[0]) {
        throw new Errors_1.NotFound("User profile not found");
    }
    const profile = {
        ...userRecord[0],
        zone: userRecord[0].zone_id ? { id: userRecord[0].zone_id, name: userRecord[0].zone_name } : null,
        shift: userRecord[0].shift_id ? { id: userRecord[0].shift_id, name: userRecord[0].shift_name } : null,
        department: userRecord[0].department_id ? { id: userRecord[0].department_id, name: userRecord[0].department_name } : null,
        job: userRecord[0].job_id ? { id: userRecord[0].job_id, name: userRecord[0].job_name } : null,
    };
    return (0, response_1.SuccessResponse)(res, { profile }, 200);
};
exports.getProfile = getProfile;
// ✅ Update Current User Profile
const updateProfile = async (req, res) => {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
        throw new Errors_1.UnauthorizedError("Authentication required");
    }
    const validated = await exports.updateProfileSchema.parseAsync({
        body: req.body,
    });
    const { name, email, phone, whatsapp, password, image } = validated.body;
    // 1. Verify user exists
    const existingUser = await db_1.db
        .select()
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, currentUserId))
        .limit(1);
    if (!existingUser[0]) {
        throw new Errors_1.NotFound("User not found");
    }
    // 2. Check email uniqueness (if changed)
    if (email && email.toLowerCase() !== existingUser[0].email.toLowerCase()) {
        const duplicateEmail = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `LOWER(TRIM(${schema_1.users.email})) = LOWER(${email})`, (0, drizzle_orm_1.ne)(schema_1.users.id, currentUserId)))
            .limit(1);
        if (duplicateEmail[0]) {
            throw new Errors_1.BadRequest("Email already exists");
        }
    }
    // 3. Check phone uniqueness (if changed)
    if (phone && phone !== existingUser[0].phone) {
        const duplicatePhone = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.users.phone, phone), (0, drizzle_orm_1.ne)(schema_1.users.id, currentUserId)))
            .limit(1);
        if (duplicatePhone[0]) {
            throw new Errors_1.BadRequest("Phone already exists");
        }
    }
    // 4. Handle image upload and delete old photo from server if it exists
    let updatedImageUrl = existingUser[0].image;
    if (req.file) {
        // New file uploaded via multipart FormData
        if (existingUser[0].image) {
            await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
        }
        updatedImageUrl = (0, upload_1.getFileUrl)(req, req.file, "Users");
    }
    else if (image !== undefined) {
        if (image && typeof image === "string" && image.startsWith("data:")) {
            // Base64 image uploaded
            if (existingUser[0].image) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
            }
            const saved = await (0, handleImages_1.saveBase64Image)(req, image, "Users");
            updatedImageUrl = saved.url;
        }
        else if (image === "" || image === null || image === "null") {
            // Image removed
            if (existingUser[0].image) {
                await (0, deleteImage_1.deletePhotoFromServer)(existingUser[0].image);
            }
            updatedImageUrl = null;
        }
    }
    // 5. Build update data payload
    const updateData = {};
    if (name !== undefined)
        updateData.name = name;
    if (email !== undefined)
        updateData.email = email;
    if (phone !== undefined)
        updateData.phone = phone;
    if (whatsapp !== undefined)
        updateData.whatsapp = whatsapp;
    if (updatedImageUrl !== existingUser[0].image)
        updateData.image = updatedImageUrl;
    // 6. Handle password (min 7 chars, hash with bcrypt)
    if (password && typeof password === "string" && password.trim().length > 0) {
        if (password.trim().length < 7) {
            throw new Errors_1.BadRequest("Password must be at least 7 characters");
        }
        updateData.password = await bcrypt_1.default.hash(password.trim(), 10);
    }
    // 7. Save updates to database
    if (Object.keys(updateData).length > 0) {
        await db_1.db.update(schema_1.users).set(updateData).where((0, drizzle_orm_1.eq)(schema_1.users.id, currentUserId));
    }
    // 8. Fetch updated user details
    const updatedUserRecord = await db_1.db
        .select({
        id: schema_1.users.id,
        name: schema_1.users.name,
        email: schema_1.users.email,
        phone: schema_1.users.phone,
        whatsapp: schema_1.users.whatsapp,
        image: schema_1.users.image,
        role: schema_1.users.role,
        status: schema_1.users.status,
        points: schema_1.users.points,
        yearly_holidays: schema_1.users.yearly_holidays,
        zone_id: schema_1.users.zone_id,
        shift_id: schema_1.users.shift_id,
        department_id: schema_1.users.department_id,
        job_id: schema_1.users.job_id,
        createdAt: schema_1.users.createdAt,
        updatedAt: schema_1.users.updatedAt,
    })
        .from(schema_1.users)
        .where((0, drizzle_orm_1.eq)(schema_1.users.id, currentUserId))
        .limit(1);
    const updatedUser = updatedUserRecord[0];
    // 9. Generate fresh token
    const token = (0, auth_1.generateUserToken)({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Profile updated successfully",
        token,
        user: updatedUser,
    }, 200);
};
exports.updateProfile = updateProfile;
