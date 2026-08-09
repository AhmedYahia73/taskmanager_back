"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotesByGroupId = exports.GroupIdSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const zod_1 = require("zod");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.GroupIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        groupId: zod_1.z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get Notes By Group ID (User/Engineer view)
const getNotesByGroupId = async (req, res) => {
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { groupId } = validated.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // Check if the user is part of the project group
    const userInGroup = await db_1.db
        .select()
        .from(schema_1.groupUsers)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.groupUsers.group_id, groupId), (0, drizzle_orm_1.eq)(schema_1.groupUsers.user_id, userId)))
        .limit(1);
    if (!userInGroup[0]) {
        return res.status(403).json({ success: false, message: "Forbidden: You are not part of this project group" });
    }
    const notes = await db_1.db
        .select({
        id: schema_1.notesBoard.id,
        notes: schema_1.notesBoard.notes,
        createdAt: schema_1.notesBoard.createdAt,
        updatedAt: schema_1.notesBoard.updatedAt,
        user_id: schema_1.notesBoard.user_id,
        group_id: schema_1.notesBoard.group_id,
        author_name: schema_1.users.name,
        author_role: schema_1.users.role,
    })
        .from(schema_1.notesBoard)
        .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.notesBoard.user_id, schema_1.users.id))
        .where((0, drizzle_orm_1.eq)(schema_1.notesBoard.group_id, groupId))
        .orderBy((0, drizzle_orm_1.desc)(schema_1.notesBoard.createdAt));
    return (0, response_1.SuccessResponse)(res, { notes }, 200);
};
exports.getNotesByGroupId = getNotesByGroupId;
