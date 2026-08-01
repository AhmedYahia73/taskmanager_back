import { db } from "./src/models/db";
import { holidays } from "./src/models/schema";

async function check() {
    const hol = await db.select().from(holidays).limit(1);
    console.log(hol);
    process.exit(0);
}
check();
