// src/middlewares/checkPermission.ts

import { Request, Response, NextFunction } from "express";
import { ModuleName, ActionName } from "../types/constant";
import { Permission } from "../types/custom";

import { db } from "../models/db"; 
import { eq } from "drizzle-orm";
import { ForbiddenError, UnauthorizedError } from "../Errors";
import { users } from "../../src/models/schema"; 

// ===================== ADMIN PERMISSIONS =====================
  

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkSuperAdmin = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "super_admin") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Super Admin or Leader")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkAdmin = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "admin") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Admin")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkTester = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "tester") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Tester")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin
export const checkEngineer = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "engineer") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Engineer")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkAdminTester = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "admin" || user.role == "tester") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Admin or Tester")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkAdminTesterEngineer = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "admin" || user.role === "tester" || user.role === "engineer") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Admin, Tester or Engineer")
        } catch (error) {
            next(error);
        }
    };
};