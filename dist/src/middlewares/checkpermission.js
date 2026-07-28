"use strict";
// src/middlewares/checkPermission.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAdminTesterEngineer = exports.checkAdminTester = exports.checkEngineer = exports.checkTester = exports.checkAdmin = exports.checkSuperAdmin = void 0;
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
            if (user.role === "admin") {
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
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkTester = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "tester") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Tester");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkTester = checkTester;
// ✅ Middleware للتحقق من صلاحيات Admin
const checkEngineer = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "engineer") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Engineer");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkEngineer = checkEngineer;
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkAdminTester = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" || user.role == "tester") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin or Tester");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminTester = checkAdminTester;
// ✅ Middleware للتحقق من صلاحيات Admin/Leader
const checkAdminTesterEngineer = () => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            if (!user) {
                throw new Errors_1.UnauthorizedError("Authentication required");
            }
            if (user.role === "admin" || user.role === "tester" || user.role === "engineer") {
                return next();
            }
            throw new Errors_1.ForbiddenError("You Must Login as Admin, Tester or Engineer");
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAdminTesterEngineer = checkAdminTesterEngineer;
