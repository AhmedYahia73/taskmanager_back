import path from "path";
import fs from "fs/promises";
import { Request } from "express";
import { v4 as uuidv4 } from "uuid"; // لتوليد أسماء فريدة

export async function saveBase64Image(
  req: Request,
  base64: string,
  folder: string
): Promise<{ url: string; relativePath: string }> {
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 format");
  }

  const mimeType = matches[1];
  let ext = mimeType.split("/")[1] || "png";
  
  // Handle common document mime types
  if (mimeType === 'application/pdf') ext = 'pdf';
  else if (mimeType === 'application/msword') ext = 'doc';
  else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') ext = 'docx';
  else if (mimeType === 'application/vnd.ms-excel') ext = 'xls';
  else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') ext = 'xlsx';
  else if (mimeType === 'application/vnd.ms-powerpoint') ext = 'ppt';
  else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') ext = 'pptx';
  else if (mimeType === 'application/zip' || mimeType === 'application/x-zip-compressed') ext = 'zip';
  else if (mimeType === 'application/x-rar-compressed') ext = 'rar';
  else if (mimeType === 'text/plain') ext = 'txt';
  else if (mimeType === 'text/csv') ext = 'csv';
  else if (mimeType.includes('officedocument')) {
      ext = mimeType.includes('word') ? 'docx' : mimeType.includes('spreadsheet') ? 'xlsx' : mimeType.includes('presentation') ? 'pptx' : 'bin';
  } else if (ext.length > 5) {
      ext = 'bin'; // fallback for unknown long types
  }

  const buffer = Buffer.from(matches[2], "base64");

  // استخدام UUID لتجنب تكرار الأسماء
  const fileName = `${uuidv4()}.${ext}`;
  const uploadsDir = path.join(__dirname, "../..", "uploads", folder);

  await fs.mkdir(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, buffer);

  // إرجاع المسار النسبي والـ URL
  const relativePath = `uploads/${folder}/${fileName}`;
  const imageUrl = `${req.protocol}://${req.get("host")}/${relativePath}`;

  return { url: imageUrl, relativePath };
}
