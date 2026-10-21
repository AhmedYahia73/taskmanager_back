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
            throw new ForbiddenError("You Must Login as Super Admin")
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

// ✅ Middleware للتحقق من صلاحيات Admin أو Leader أو Sales
export const checkAdminLeaderSales = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "admin" || user.role === "super_admin" || user.role === "leader_sales" || user.role === "sales") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Admin, Leader or Sales");
        } catch (error) {
            next(error);
        }
    };
};

export const checkAdminLeader = checkAdminLeaderSales;

// ✅ Middleware للتحقق من صلاحيات Admin/Leader
export const checkTester = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "engineer" || user.role === "leader_sales" || user.role === "admin" || user.role === "super_admin") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Engineer, Leader or Admin")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Engineer أو Leader Sales
export const checkEngineer = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (user.role === "engineer" || user.role === "leader_sales") {
                return next();
            }
            throw new ForbiddenError("You Must Login as Engineer or Leader Sales")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من صلاحيات Admin/Project Leader
export const checkAdminTester = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (
                user.role === "admin" || 
                user.role === "super_admin" || 
                user.role === "engineer" || 
                user.role === "leader_sales"
            ) {
                return next();
            }
            throw new ForbiddenError("You Must Login as Admin, Engineer, or Leader Sales")
        } catch (error) {
            next(error);
        }
    };
};

// ✅ Middleware للتحقق من كافة الصلاحيات المعتمدة
export const checkAdminTesterEngineer = () => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = req.user;

            if (!user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (
                user.role === "admin" ||
                user.role === "super_admin" ||
                user.role === "engineer" ||
                user.role === "sales" ||
                user.role === "leader_sales"
            ) {
                return next();
            }
            throw new ForbiddenError("You Must Login with an authorized role");
        } catch (error) {
            next(error);
        }
    };
};