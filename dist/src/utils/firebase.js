"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.sendTopicNotification = exports.getNotificationTitle = exports.getAdminTokens = exports.getUserTokens = exports.unregisterUserToken = exports.registerUserToken = exports.getFirebaseAdmin = void 0;
// src/utils/firebase.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../models/db");
const schema_1 = require("../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cleanEnvValue = (val) => {
    if (!val)
        return "";
    let v = val.trim();
    if (v.endsWith(",")) {
        v = v.slice(0, -1).trim();
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
    }
    return v;
};
let firebaseApp = null;
/**
 * 🔒 Initialize or retrieve the Firebase Admin App instance.
 * Reads credentials from environment variables (.env).
 * Supports both standard and Google JSON service account formats.
 */
const getFirebaseAdmin = () => {
    if (firebase_admin_1.default.apps.length > 0) {
        return firebase_admin_1.default;
    }
    const projectId = cleanEnvValue(process.env.project_id || process.env.FIREBASE_PROJECT_ID);
    const clientEmail = cleanEnvValue(process.env.client_email || process.env.FIREBASE_CLIENT_EMAIL);
    let privateKey = cleanEnvValue(process.env.private_key || process.env.FIREBASE_PRIVATE_KEY);
    if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, "\n");
    }
    if (!projectId || !clientEmail || !privateKey) {
        console.warn("[Firebase] ⚠️ Missing Firebase credentials in .env (project_id, client_email, or private_key). Push notifications are currently inactive.");
        return null;
    }
    try {
        firebaseApp = firebase_admin_1.default.initializeApp({
            credential: firebase_admin_1.default.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
        console.log(`[Firebase] ✅ Firebase Admin SDK initialized successfully (Project: ${projectId})`);
        return firebase_admin_1.default;
    }
    catch (error) {
        console.error("[Firebase] ❌ Failed to initialize Firebase Admin SDK:", error);
        return null;
    }
};
exports.getFirebaseAdmin = getFirebaseAdmin;
// Initial startup check
(0, exports.getFirebaseAdmin)();
// Token persistence file path
const TOKENS_FILE = path_1.default.join(process.cwd(), "uploads", "fcm_tokens.json");
// In-memory token registries
const userTokensStore = new Map();
const adminRoleTokens = new Set();
// Helper to load persistent tokens from disk
const loadTokensFromDisk = () => {
    try {
        if (fs_1.default.existsSync(TOKENS_FILE)) {
            const content = fs_1.default.readFileSync(TOKENS_FILE, "utf-8");
            const data = JSON.parse(content);
            // Support format with users and adminTokens or simple format
            if (data.users && typeof data.users === "object") {
                for (const [uid, tokens] of Object.entries(data.users)) {
                    if (Array.isArray(tokens)) {
                        userTokensStore.set(uid, new Set(tokens));
                    }
                }
            }
            else if (typeof data === "object") {
                for (const [uid, tokens] of Object.entries(data)) {
                    if (uid !== "adminTokens" && Array.isArray(tokens)) {
                        userTokensStore.set(uid, new Set(tokens));
                    }
                }
            }
            if (Array.isArray(data.adminTokens)) {
                for (const t of data.adminTokens) {
                    if (typeof t === "string" && t.trim().length > 0) {
                        adminRoleTokens.add(t.trim());
                    }
                }
            }
            console.log(`[FCM] 💾 Loaded ${userTokensStore.size} user token sets and ${adminRoleTokens.size} admin tokens from disk`);
        }
    }
    catch (err) {
        console.error("[FCM] Error loading tokens from disk:", err);
    }
};
// Helper to persist tokens to disk
const saveTokensToDisk = () => {
    try {
        const dir = path_1.default.dirname(TOKENS_FILE);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const usersObj = {};
        for (const [uid, set] of userTokensStore.entries()) {
            usersObj[uid] = Array.from(set);
        }
        const payload = {
            users: usersObj,
            adminTokens: Array.from(adminRoleTokens),
        };
        fs_1.default.writeFileSync(TOKENS_FILE, JSON.stringify(payload, null, 2), "utf-8");
    }
    catch (err) {
        console.error("[FCM] Error saving tokens to disk:", err);
    }
};
// Initialize from disk
loadTokensFromDisk();
/**
 * 📱 Register a device FCM token for a user and subscribe to their personal topics.
 * Ensures a device token is exclusively linked to the current active user.
 */
const registerUserToken = async (userId, token, role) => {
    if (!userId || !token)
        return false;
    const cleanToken = token.trim();
    if (!cleanToken)
        return false;
    const normalizedRole = role?.toLowerCase();
    const isAdmin = normalizedRole === "admin" || normalizedRole === "super_admin";
    // 🔒 1. Disassociate this token from ANY other user account (e.g. account switching on same device)
    for (const [otherUid, tokensSet] of userTokensStore.entries()) {
        if (otherUid !== userId && tokensSet.has(cleanToken)) {
            tokensSet.delete(cleanToken);
            console.log(`[FCM] 🔄 Disassociated token from previous user ${otherUid} to assign to current user ${userId}`);
        }
    }
    // 🔒 2. Manage adminRoleTokens
    if (isAdmin) {
        adminRoleTokens.add(cleanToken);
    }
    else {
        adminRoleTokens.delete(cleanToken);
    }
    // 3. Save to current user's token set
    if (!userTokensStore.has(userId)) {
        userTokensStore.set(userId, new Set());
    }
    userTokensStore.get(userId).add(cleanToken);
    saveTokensToDisk();
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return false;
    try {
        // 4. Subscribe to personal user topic
        await fb.messaging().subscribeToTopic([cleanToken], `user_${userId}`);
        // 5. Admin topic management: subscribe only if admin, otherwise explicitly unsubscribe
        if (isAdmin) {
            await fb.messaging().subscribeToTopic([cleanToken], "admins");
        }
        else {
            try {
                await fb.messaging().unsubscribeFromTopic([cleanToken], "admins");
            }
            catch (e) { }
        }
        // 6. Role topic subscription
        if (normalizedRole) {
            await fb.messaging().subscribeToTopic([cleanToken], normalizedRole);
        }
        console.log(`[FCM] 📲 Registered token exclusively for user ${userId} (${normalizedRole || "user"})`);
        return true;
    }
    catch (err) {
        console.error(`[FCM] ❌ Error subscribing token for user ${userId}:`, err);
        return false;
    }
};
exports.registerUserToken = registerUserToken;
/**
 * 🗑️ Unregister a device FCM token for a user
 */
const unregisterUserToken = async (userId, token) => {
    if (!userId || !token)
        return;
    const cleanToken = token.trim();
    userTokensStore.get(userId)?.delete(cleanToken);
    adminRoleTokens.delete(cleanToken);
    saveTokensToDisk();
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return;
    try {
        await fb.messaging().unsubscribeFromTopic([cleanToken], `user_${userId}`);
        await fb.messaging().unsubscribeFromTopic([cleanToken], "admins");
    }
    catch (err) {
        console.error(`[FCM] Error unsubscribing token:`, err);
    }
};
exports.unregisterUserToken = unregisterUserToken;
/**
 * 🔍 Get all active tokens for a list of user IDs
 */
const getUserTokens = (userIds) => {
    const result = [];
    for (const uid of userIds) {
        const set = userTokensStore.get(uid);
        if (set) {
            result.push(...Array.from(set));
        }
    }
    return result;
};
exports.getUserTokens = getUserTokens;
/**
 * 👑 Get all active tokens for verified Admins ONLY (from database)
 */
const getAdminTokens = async () => {
    const result = new Set();
    try {
        const adminUsers = await db_1.db
            .select({ id: schema_1.users.id })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.users.role, "admin"), (0, drizzle_orm_1.eq)(schema_1.users.role, "super_admin")));
        for (const u of adminUsers) {
            const userTokens = userTokensStore.get(u.id);
            if (userTokens) {
                for (const t of userTokens) {
                    result.add(t);
                }
            }
        }
    }
    catch (e) {
        console.error("[FCM] Error querying admin users for tokens:", e);
        // Fallback only if db fails
        for (const t of adminRoleTokens) {
            result.add(t);
        }
    }
    return Array.from(result);
};
exports.getAdminTokens = getAdminTokens;
/**
 * 🏷️ Helper to generate meaningful notification title based on type
 */
const getNotificationTitle = (type) => {
    switch (type) {
        case "task_status":
            return "تحديث حالة المهمة | Task Status";
        case "online_days":
            return "أيام العمل أونلاين | Online Work Days";
        case "extra_time_request":
            return "طلب وقت إضافي | Extra Time Request";
        case "holiday_request":
            return "طلب إجازة | Leave Request";
        case "permission_request":
            return "طلب إذن | Permission Request";
        case "online_request":
            return "طلب عمل أونلاين | Online Request";
        default:
            return "إشعار جديد | New Notification";
    }
};
exports.getNotificationTitle = getNotificationTitle;
/**
 * 📢 Send a Push Notification to a topic (e.g. 'admins', 'user_123', 'engineer')
 */
const sendTopicNotification = async (topic, title, body, data) => {
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return false;
    try {
        const stringifiedData = {};
        if (data) {
            for (const [k, v] of Object.entries(data)) {
                if (v !== undefined && v !== null) {
                    stringifiedData[k] = typeof v === "string" ? v : JSON.stringify(v);
                }
            }
        }
        const message = {
            topic,
            notification: {
                title,
                body,
            },
            data: stringifiedData,
            webpush: {
                headers: {
                    Urgency: "high",
                },
                notification: {
                    title,
                    body,
                    icon: "/logo.png",
                    badge: "/favicon.svg",
                    tag: stringifiedData.id || stringifiedData.task_id || `taskito_${stringifiedData.type || 'notif'}`,
                    renotify: false,
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: stringifiedData.link || "/admin",
                },
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "high_importance_channel",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };
        const response = await fb.messaging().send(message);
        console.log(`[FCM Topic: ${topic}] 🚀 Sent successfully:`, response);
        return true;
    }
    catch (error) {
        console.error(`[FCM Topic: ${topic}] ❌ Error sending notification:`, error);
        return false;
    }
};
exports.sendTopicNotification = sendTopicNotification;
/**
 * 📲 Send a Push Notification to specific device tokens (Multicast)
 */
const sendPushNotification = async (tokens, title, body, data) => {
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return;
    if (!tokens || tokens.length === 0) {
        return;
    }
    // Remove duplicates and empty tokens
    const cleanTokens = Array.from(new Set(tokens.filter((t) => typeof t === "string" && t.trim().length > 0)));
    if (cleanTokens.length === 0)
        return;
    try {
        const stringifiedData = {};
        if (data) {
            for (const [k, v] of Object.entries(data)) {
                if (v !== undefined && v !== null) {
                    stringifiedData[k] = typeof v === "string" ? v : JSON.stringify(v);
                }
            }
        }
        const message = {
            tokens: cleanTokens,
            notification: {
                title,
                body,
            },
            data: stringifiedData,
            webpush: {
                headers: {
                    Urgency: "high",
                },
                notification: {
                    title,
                    body,
                    icon: "/logo.png",
                    badge: "/favicon.svg",
                    tag: stringifiedData.id || stringifiedData.task_id || `taskito_${stringifiedData.type || 'notif'}`,
                    renotify: false,
                    requireInteraction: true,
                },
                fcmOptions: {
                    link: stringifiedData.link || "/admin",
                },
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channelId: "high_importance_channel",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };
        const response = await fb.messaging().sendEachForMulticast(message);
        console.log(`[FCM Multicast] 🚀 Success: ${response.successCount}, Failed: ${response.failureCount}`);
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                console.error(`[FCM Multicast] Failed to send to token [${idx}]:`, resp.error?.message);
            }
        });
    }
    catch (error) {
        console.error("[FCM Multicast] ❌ Error sending notification:", error);
    }
};
exports.sendPushNotification = sendPushNotification;
