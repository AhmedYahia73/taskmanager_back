// src/types/custom.ts

import { ModuleName, ActionName } from "../constants/permissions";

export interface PermissionAction {
    id?: string;  // ✅ optional
    action: ActionName;
}

export interface Permission {
    module: ModuleName;
    actions: PermissionAction[];
}

export type AdminType = "admin";
export type SuperAdminType = "super_admin";
export type TesterType = "tester";
export type EngineerType = "engineer";
export type Role = AdminType | SuperAdminType | TesterType | EngineerType;

export interface TokenPayload {
    id: string;
    name: string;
    role: Role;
    email?: string;
    phone?: string; 
}

export type AppUser = TokenPayload;

declare global {
    namespace Express {
        interface Request {
            user?: AppUser;
            parent?: AppUser;
        }
    }
}