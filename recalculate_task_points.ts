import { db } from "./src/models/db";
import { tasks, users, settings } from "./src/models/schema";
import { eq, desc, sql } from "drizzle-orm";
import { calculatePointsForTask, toDateOnlyString } from "./src/controllers/admin/tasks";

async function run() {
    console.log("🚀 Starting task points recalculation...");

    const [setting] = await db.select().from(settings).orderBy(desc(settings.createdAt)).limit(1);
    if (!setting) {
        console.error("❌ No system settings found!");
        process.exit(1);
    }

    console.log("⚙️ Settings in use:", {
        task_approve_points: setting.task_approve_points,
        task_edit_points: setting.task_edit_points,
        task_delay_points: setting.task_delay_points,
    });

    const approvedTasks = await db
        .select({
            id: tasks.id,
            name: tasks.name,
            user_id: tasks.user_id,
            delivery_date: tasks.delivery_date,
            done_date: tasks.done_date,
            is_edit: tasks.is_edit,
            extra_points: tasks.extra_points,
            currentPoints: tasks.points,
        })
        .from(tasks)
        .where(eq(tasks.status, "approve"));

    console.log(`📋 Found ${approvedTasks.length} approved tasks.`);

    let updatedCount = 0;
    for (const t of approvedTasks) {
        const correctPoints = calculatePointsForTask(
            {
                delivery_date: t.delivery_date,
                done_date: t.done_date,
                is_edit: t.is_edit,
                extra_points: t.extra_points,
            },
            setting
        );

        if (t.currentPoints !== correctPoints) {
            console.log(
                `🔄 Task "${t.name}" (${t.id}): points ${t.currentPoints} -> ${correctPoints} (delivery: ${t.delivery_date}, done: ${toDateOnlyString(t.done_date)}, is_edit: ${t.is_edit})`
            );
            await db
                .update(tasks)
                .set({ points: correctPoints })
                .where(eq(tasks.id, t.id));
            updatedCount++;
        }
    }

    console.log(`✅ Updated ${updatedCount} tasks with correct points.`);

    // Recalculate users.points from approved tasks
    console.log("🔄 Recalculating users total points from approved tasks...");
    await db.execute(sql`
        UPDATE users u
        LEFT JOIN (
            SELECT user_id, COALESCE(SUM(points), 0) AS total_task_points
            FROM tasks
            WHERE status = 'approve' AND user_id IS NOT NULL
            GROUP BY user_id
        ) tp ON u.id = tp.user_id
        SET u.points = COALESCE(tp.total_task_points, 0)
    `);

    console.log("🎉 User points updated successfully!");
    process.exit(0);
}

run().catch((err) => {
    console.error("❌ Error during recalculation:", err);
    process.exit(1);
});
