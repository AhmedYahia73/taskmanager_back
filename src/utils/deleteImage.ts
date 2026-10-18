import fs from "fs/promises";
import path from "path";

export const deletePhotoFromServer = async (
  imageUrlOrPath: string
): Promise<boolean> => {
  try {
    // استخراج المسار النسبي من الـ URL أو استخدامه مباشرة
    let relativePath = imageUrlOrPath;
    
    // لو كان URL كامل، نستخرج المسار
    if (imageUrlOrPath.startsWith("http")) {
      const url = new URL(imageUrlOrPath);
      relativePath = url.pathname.startsWith("/") 
        ? url.pathname.slice(1) 
        : url.pathname;
    }
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
    relativePath = decodeURIComponent(relativePath);

    const candidates = [
      path.resolve(process.cwd(), relativePath),
      path.join(__dirname, "../..", relativePath),
      path.join(__dirname, "../../..", relativePath),
    ];

    for (const filePath of candidates) {
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        return true;
      } catch {
        // try next candidate
      }
    }
    
    return false;
  } catch (err) {
    console.error("Error deleting photo:", err);
    return false; // لا نرمي خطأ، فقط نرجع false
  }
};
