"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.sendTopicNotification = exports.getUserTokens = exports.unregisterUserToken = exports.registerUserToken = exports.getFirebaseAdmin = void 0;
// src/utils/firebase.ts
const firebase_admin_1 = __importDefault(require("firebase-admin"));
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
// In-memory token registry per user (userId -> Set of FCM tokens)
const userTokensStore = new Map();
/**
 * 📱 Register a device FCM token for a user and subscribe to their topics.
 */
const registerUserToken = async (userId, token, role) => {
    if (!userId || !token)
        return false;
    const cleanToken = token.trim();
    if (!cleanToken)
        return false;
    // Save to memory store
    if (!userTokensStore.has(userId)) {
        userTokensStore.set(userId, new Set());
    }
    userTokensStore.get(userId).add(cleanToken);
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return false;
    try {
        // 1. Subscribe to personal user topic
        await fb.messaging().subscribeToTopic([cleanToken], `user_${userId}`);
        // 2. If role is admin or super_admin, subscribe to 'admins' topic
        const normalizedRole = role?.toLowerCase();
        if (normalizedRole === "admin" || normalizedRole === "super_admin") {
            await fb.messaging().subscribeToTopic([cleanToken], "admins");
        }
        // 3. Subscribe to role topic (e.g. 'engineers', 'sales', etc.)
        if (normalizedRole) {
            await fb.messaging().subscribeToTopic([cleanToken], normalizedRole);
        }
        console.log(`[FCM] 📲 Registered token for user ${userId} and subscribed to topics`);
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
 * 📢 Send a Push Notification to a topic (e.g. 'admins', 'user_123', 'engineer')
 */
const sendTopicNotification = async (topic, title, body, data) => {
    const fb = (0, exports.getFirebaseAdmin)();
    if (!fb)
        return false;
    try {
        const message = {
            topic,
            notification: {
                title,
                body,
            },
            data: data || {},
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
        const message = {
            tokens: cleanTokens,
            notification: {
                title,
                body,
            },
            data: data || {},
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
