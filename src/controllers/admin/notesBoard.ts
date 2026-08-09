import { Request, Response } from "express";
import { db } from "../../models/db";
import { notesBoard, users, projectGroups } from "../../models/schema"; 
import { eq, desc } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const createNoteSchema = z.object({
  body: z.object({
    group_id: z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
    notes: z.string({ required_error: "Note content is required" }).min(1, "Note cannot be empty"),
  }),
});

export const updateNoteSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Note ID is required" }).uuid("Invalid Note ID format"),
  }),
  body: z.object({
    notes: z.string({ required_error: "Note content is required" }).min(1, "Note cannot be empty"),
  }),
});

export const NoteIdSchema = z.object({
  params: z.object({
    id: z.string({ required_error: "Note ID is required" }).uuid("Invalid Note ID format"),
  }),
});

export const GroupIdSchema = z.object({
  params: z.object({
    groupId: z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get Notes By Group ID
export const getNotesByGroupId = async (req: Request, res: Response) => {
    const validated = await GroupIdSchema.parseAsync({ params: req.params });
    const { groupId } = validated.params; 

    const notes = await db
        .select({
            id: notesBoard.id,
            notes: notesBoard.notes,
            createdAt: notesBoard.createdAt,
            updatedAt: notesBoard.updatedAt,
            user_id: notesBoard.user_id,
            group_id: notesBoard.group_id,
            author_name: users.name,
            author_role: users.role,
        })
        .from(notesBoard)
        .leftJoin(users, eq(notesBoard.user_id, users.id))
        .where(eq(notesBoard.group_id, groupId))
        .orderBy(desc(notesBoard.createdAt));

    return SuccessResponse(res, { notes }, 200);
};

// ✅ Create Note
export const createNote = async (req: Request, res: Response) => {
    const validated = await createNoteSchema.parseAsync({ body: req.body });
    const { group_id, notes } = validated.body;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Verify group exists
    const groupExists = await db.select().from(projectGroups).where(eq(projectGroups.id, group_id)).limit(1);
    if (!groupExists[0]) {
        throw new NotFound("Project group not found");
    }

    const noteId = uuidv4();

    await db.insert(notesBoard).values({
        id: noteId,
        user_id: userId,
        group_id,
        notes,
    });

    return SuccessResponse(res, { message: "Note created successfully", id: noteId }, 201);
};

// ✅ Update Note
export const updateNote = async (req: Request, res: Response) => {
    const validated = await updateNoteSchema.parseAsync({ 
        params: req.params, 
        body: req.body 
    });
    const { id } = validated.params;
    const { notes } = validated.body;
  
    const existingNote = await db
        .select()
        .from(notesBoard)
        .where(eq(notesBoard.id, id))
        .limit(1);

    if (!existingNote[0]) {
        throw new NotFound("Note not found");
    }

    // Check permissions: Only admin, super_admin, or the note's author can update
    const isOwner = existingNote[0].user_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to update this note" });
    }

    await db.update(notesBoard)
        .set({ notes })
        .where(eq(notesBoard.id, id));

    return SuccessResponse(res, { message: "Note updated successfully" }, 200);
};

// ✅ Delete Note
export const deleteNote = async (req: Request, res: Response) => {
    const validated = await NoteIdSchema.parseAsync({ params: req.params });
    const { id } = validated.params; 
 
    const existingNote = await db
        .select()
        .from(notesBoard)
        .where(eq(notesBoard.id, id))
        .limit(1);

    if (!existingNote[0]) {
        throw new NotFound("Note not found");
    }

    // Check permissions: Only admin, superadmin, or the note's author can delete
    const isOwner = existingNote[0].user_id === req.user?.id;
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin'; 
    const isTester = req.user?.role === 'tester';
    
    // Tester can delete their own note (isOwner), Admin can delete any note.
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: "Forbidden: You don't have permission to delete this note" });
    }

    await db.delete(notesBoard).where(eq(notesBoard.id, id));

    return SuccessResponse(res, { message: "Note deleted successfully" }, 200);
};
