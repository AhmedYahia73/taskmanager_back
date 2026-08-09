"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNote = exports.updateNote = exports.createNote = exports.getNotesByGroupId = exports.GroupIdSchema = exports.NoteIdSchema = exports.updateNoteSchema = exports.createNoteSchema = void 0;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================
exports.createNoteSchema = zod_1.z.object({
    body: zod_1.z.object({
        group_id: zod_1.z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
        notes: zod_1.z.string({ required_error: "Note content is required" }).min(1, "Note cannot be empty"),
    }),
});
exports.updateNoteSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "Note ID is required" }).uuid("Invalid Note ID format"),
    }),
    body: zod_1.z.object({
        notes: zod_1.z.string({ required_error: "Note content is required" }).min(1, "Note cannot be empty"),
    }),
});
exports.NoteIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string({ required_error: "Note ID is required" }).uuid("Invalid Note ID format"),
    }),
});
exports.GroupIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        groupId: zod_1.z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
    }),
});
// ==========================================
// 🎮 Controllers
// ==========================================
// ✅ Get Notes By Group ID
const getNotesByGroupId = async (req, res) => {
    const validated = await exports.GroupIdSchema.parseAsync({ params: req.params });
    const { groupId } = validated.params;
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
// ✅ Create Note
const createNote = async (req, res) => {
    const validated = await exports.createNoteSchema.parseAsync({ body: req.body });
    const { group_id, notes } = validated.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    // Verify group exists
    const groupExists = await db_1.db.select().from(schema_1.projectGroups).where((0, drizzle_orm_1.eq)(schema_1.projectGroups.id, group_id)).limit(1);
    if (!groupExists[0]) {
        throw new NotFound_1.NotFound("Project group not found");
    }
    const noteId = (0, uuid_1.v4)();
    await db_1.db.insert(schema_1.notesBoard).values({
        id: noteId,
        user_id: userId,
        group_id,
        notes,
    });
    return (0, response_1.SuccessResponse)(res, { message: "Note created successfully", id: noteId }, 201);
};
exports.createNote = createNote;
// ✅ Update Note
const updateNote = async (req, res) => {
    const validated = await exports.updateNoteSchema.parseAsync({
        params: req.params,
        body: req.body
    });
    const { id } = validated.params;
    const { notes } = validated.body;
    const existingNote = await db_1.db
        .select()
        .from(schema_1.notesBoard)
        .where((0, drizzle_orm_1.eq)(schema_1.notesBoard.id, id))
        .limit(1);
    if (!existingNote[0]) {
        throw new NotFound_1.NotFound("Note not found");
    }
    // Check permissions: Only admin, super_admin, or the note's author can update
    const isOwner = existingNote[0].user_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to update this note" });
    }
    await db_1.db.update(schema_1.notesBoard)
        .set({ notes })
        .where((0, drizzle_orm_1.eq)(schema_1.notesBoard.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Note updated successfully" }, 200);
};
exports.updateNote = updateNote;
// ✅ Delete Note
const deleteNote = async (req, res) => {
    const validated = await exports.NoteIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params;
    const existingNote = await db_1.db
        .select()
        .from(schema_1.notesBoard)
        .where((0, drizzle_orm_1.eq)(schema_1.notesBoard.id, id))
        .limit(1);
    if (!existingNote[0]) {
        throw new NotFound_1.NotFound("Note not found");
    }
    // Check permissions: Only admin, superadmin, or the note's author can delete
    const isOwner = existingNote[0].user_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
    const isTester = req.user?.role === 'tester';
    // Tester can delete their own note (isOwner), Admin can delete any note.
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to delete this note" });
    }
    await db_1.db.delete(schema_1.notesBoard).where((0, drizzle_orm_1.eq)(schema_1.notesBoard.id, id));
    return (0, response_1.SuccessResponse)(res, { message: "Note deleted successfully" }, 200);
};
exports.deleteNote = deleteNote;
