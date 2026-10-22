"use strict";
// src/middlewares/checkPermission.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdminTesterEngineer = exports.checkAdminTester = exports.checkEngineer = exports.checkTester = exports.checkAdminLeaderSales = exports.checkAdminLeader = exports.checkAdmin = exports.checkSuperAdmin = void 0;
const Errors_1 = require("../Errors");
// ===================== ADMIN PERMISSIONS =====================
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkSuperAdmin = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "super_admin") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Super Admin");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkSuperAdmin = checkSuperAdmin;
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkAdmin = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" || user.role === "super_admin") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdmin = checkAdmin;
// ✅ Middleware للتحقق من صلاحيات Admin أو Leader
const checkAdminLeader = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" || user.role === "super_admin" || user.role === "leader_sales" || user.role === "leader") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin or Leader");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminLeader = checkAdminLeader;
// ✅ Middleware للتحقق من صلاحيات Admin أو Leader أو Sales
const checkAdminLeaderSales = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" ||
                user.role === "super_admin" ||
                user.role === "leader_sales" ||
                user.role === "leader" ||
                user.role === "sales" ||
                user.role === "engineer") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin, Leader or Sales");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminLeaderSales = checkAdminLeaderSales;
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkTester = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "engineer" || user.role === "leader_sales" || user.role === "admin" || user.role === "super_admin") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Engineer, Leader or Admin");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkTester = checkTester;
// ✅ Middleware للتحقق من صلاحيات Engineer أو Leader Sales
const checkEngineer = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "engineer" || user.role === "leader_sales") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Engineer or Leader Sales");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkEngineer = checkEngineer;
// ✅ Middleware للتحقق من صلاحيات Admin/Project Leader
const checkAdminTester = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" ||
                user.role === "super_admin" ||
                user.role === "engineer" ||
                user.role === "leader_sales") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin, Engineer, or Leader Sales");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminTester = checkAdminTester;
// ✅ Middleware للتحقق من كافة الصلاحيات المعتمدة
const checkAdminTesterEngineer = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" ||
                user.role === "super_admin" ||
                user.role === "engineer" ||
                user.role === "sales" ||
                user.role === "leader_sales") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login with an authorized role");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminTesterEngineer = checkAdminTesterEngineer;
