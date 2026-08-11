// src/controllers/auth/authController.ts

import { Request, Response } from "express";
import { db } from "../../models/db";
import { users, settings } from "../../models/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generateUserToken } from "../../utils/auth";
import { UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { addToBlacklist } from "../../utils/tokenBlacklist";
import { Permission } from "../../types/custom";
 

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  // 1) جلب الأدمن بالإيميل
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user[0]) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // 2) التحقق من الباسورد
  const match = await bcrypt.compare(password, user[0].password);
  if (!match) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // 3) التحقق من حالة الحساب
  if (user[0].status !== "active") {
    throw new UnauthorizedError("Your account is inactive");
  } 

  // 5) إنشاء التوكن
  const tokenPayload = {
    id: user[0].id,
    role: user[0].role,
    email: user[0].email,
    name: user[0].name,
    phone: user[0].phone,
  };

  const token = generateUserToken(tokenPayload);

  // 6) الرد
  return SuccessResponse(
    res,
    {
      message: "Login successful",
      token,
      user: {
        id: user[0].id,
        name: user[0].name,
        email: user[0].email,
        phone: user[0].phone,
        role: user[0].role, 
      },
    },
    200
  );
}
export async function hash_password(req: Request, res: Response) {
  const { password } = req.body;
  
  // 6) الرد
  return SuccessResponse(
    res,
    {
      password: await bcrypt.hash(password, 10), 
    },
    200
  );
}

export async function logout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    addToBlacklist(token);
  }

  return SuccessResponse(
    res,
    {
      message: "Logout successful",
    },
    200
  );
}

export async function switchRole(req: Request, res: Response) {
  const { role } = req.body; // 'tester' or 'engineer'
  const user = req.user; // from authenticated middleware

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  // Create new token with requested role
  const tokenPayload = {
    id: user.id as string,
    role: role as "super_admin" | "admin" | "tester" | "engineer",
    email: user.email as string,
    name: user.name as string,
    phone: user.phone as string,
  };

  const token = generateUserToken(tokenPayload);

  return SuccessResponse(
    res,
    {
      message: "Role switched successfully",
      token,
      user: {
        ...user,
        role: role,
      },
    },
    200
  );
}

export async function getSettingsNames(req: Request, res: Response) {
  const names = await db
    .select({
      user: settings.user,
      leader: settings.leader,
    })
    .from(settings)
    .orderBy(desc(settings.createdAt))
    .limit(1);

  return SuccessResponse(
    res,
    {
      user: names[0]?.user || "Employee",
      leader: names[0]?.leader || "Leader",
    },
    200
  );
}
 