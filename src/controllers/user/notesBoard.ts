import { Request, Response } from "express";
import { db } from "../../models/db";
import { notesBoard, users, projectGroups, groupUsers } from "../../models/schema"; 
import { eq, desc, and } from 'drizzle-orm';
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors/NotFound";
import { z } from "zod";

// ==========================================
// 🛡️ Zod Validation Schemas
// ==========================================

export const GroupIdSchema = z.object({
  params: z.object({
    groupId: z.string({ required_error: "Group ID is required" }).uuid("Invalid Group ID format"),
  }),
});

// ==========================================
// 🎮 Controllers
// ==========================================

// ✅ Get Notes By Group ID (User/Engineer view)
export const getNotesByGroupId = async (req: Request, res: Response) => {
    const validated = await GroupIdSchema.parseAsync({ params: req.params });
    const { groupId } = validated.params;
    const userId = req.user?.id;

    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Check if the user is part of the project group
    const userInGroup = await db
        .select()
        .from(groupUsers)
        .where(and(eq(groupUsers.group_id, groupId), eq(groupUsers.user_id, userId)))
        .limit(1);

    if (!userInGroup[0]) {
        return res.status(403).json({ success: false, message: "Forbidden: You are not part of this project group" });
    }

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
