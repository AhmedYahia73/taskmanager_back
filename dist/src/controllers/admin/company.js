"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompany = getCompany;
exports.updateCompany = updateCompany;
const db_1 = require("../../models/db");
const schema_1 = require("../../models/schema");
const response_1 = require("../../utils/response");
const drizzle_orm_1 = require("drizzle-orm");
const handleImages_1 = require("../../utils/handleImages");
const deleteImage_1 = require("../../utils/deleteImage");
async function getCompany(req, res) {
    const result = await db_1.db.select().from(schema_1.companies).limit(1);
    return (0, response_1.SuccessResponse)(res, result.length > 0 ? result[0] : null, 200);
}
async function updateCompany(req, res) {
    const body = req.body;
    const existing = await db_1.db.select().from(schema_1.companies).limit(1);
    let companyLogo = body.logo;
    if (body.logo && body.logo.startsWith("data:")) {
        const result = await (0, handleImages_1.saveBase64Image)(req, body.logo, "companies");
        companyLogo = result.url;
        if (existing.length > 0 && existing[0].logo) {
            await (0, deleteImage_1.deletePhotoFromServer)(existing[0].logo);
        }
    }
    body.logo = companyLogo;
    if (existing.length === 0) {
        // Create first record if not exists
        await db_1.db.insert(schema_1.companies).values(body);
    }
    else {
        // Update existing record
        await db_1.db.update(schema_1.companies).set(body).where((0, drizzle_orm_1.eq)(schema_1.companies.id, existing[0].id));
    }
    const updated = await db_1.db.select().from(schema_1.companies).limit(1);
    return (0, response_1.SuccessResponse)(res, updated[0], 200);
}
