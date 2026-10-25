// src/utils/firebase.ts
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

const cleanEnvValue = (val?: string): string => {
  if (!val) return "";
  let v = val.trim();
  if (v.endsWith(",")) {
    v = v.slice(0, -1).trim();
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
};

let firebaseApp: admin.app.App | null = null;

/**
 * 🔒 Initialize or retrieve the Firebase Admin App instance.
 * Reads credentials from environment variables (.env).
 * Supports both standard and Google JSON service account formats.
 */
export const getFirebaseAdmin = (): typeof admin | null => {
  if (admin.apps.length > 0) {
    return admin;
  }

  const projectId = cleanEnvValue(process.env.project_id || process.env.FIREBASE_PROJECT_ID);
  const clientEmail = cleanEnvValue(process.env.client_email || process.env.FIREBASE_CLIENT_EMAIL);
  let privateKey = cleanEnvValue(process.env.private_key || process.env.FIREBASE_PRIVATE_KEY);

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firebase] ⚠️ Missing Firebase credentials in .env (project_id, client_email, or private_key). Push notifications are currently inactive."
    );
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log(`[Firebase] ✅ Firebase Admin SDK initialized successfully (Project: ${projectId})`);
    return admin;
  } catch (error) {
    console.error("[Firebase] ❌ Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
};

// Initial startup check
getFirebaseAdmin();

// Token persistence file path
const TOKENS_FILE = path.join(process.cwd(), "uploads", "fcm_tokens.json");

// Helper to load persistent tokens from disk
const loadTokensFromDisk = (): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const content = fs.readFileSync(TOKENS_FILE, "utf-8");
      const data = JSON.parse(content);
      for (const [uid, tokens] of Object.entries(data)) {
        if (Array.isArray(tokens)) {
          map.set(uid, new Set(tokens as string[]));
        }
      }
      console.log(`[FCM] 💾 Loaded ${map.size} user token sets from disk`);
    }
  } catch (err) {
    console.error("[FCM] Error loading tokens from disk:", err);
  }
  return map;
};

// Helper to persist tokens to disk
const saveTokensToDisk = (map: Map<string, Set<string>>) => {
  try {
    const dir = path.dirname(TOKENS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const obj: Record<string, string[]> = {};
    for (const [uid, set] of map.entries()) {
      obj[uid] = Array.from(set);
    }
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("[FCM] Error saving tokens to disk:", err);
  }
};

// In-memory token registry per user (userId -> Set of FCM tokens)
const userTokensStore = loadTokensFromDisk();

/**
 * 📱 Register a device FCM token for a user and subscribe to their topics.
 */
export const registerUserToken = async (userId: string, token: string, role?: string): Promise<boolean> => {
  if (!userId || !token) return false;

  const cleanToken = token.trim();
  if (!cleanToken) return false;

  // Save to memory store and disk
  if (!userTokensStore.has(userId)) {
    userTokensStore.set(userId, new Set());
  }
  userTokensStore.get(userId)!.add(cleanToken);
  saveTokensToDisk(userTokensStore);

  const fb = getFirebaseAdmin();
  if (!fb) return false;

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
  } catch (err) {
    console.error(`[FCM] ❌ Error subscribing token for user ${userId}:`, err);
    return false;
  }
};

/**
 * 🗑️ Unregister a device FCM token for a user
 */
export const unregisterUserToken = async (userId: string, token: string): Promise<void> => {
  if (!userId || !token) return;

  const cleanToken = token.trim();
  userTokensStore.get(userId)?.delete(cleanToken);
  saveTokensToDisk(userTokensStore);

  const fb = getFirebaseAdmin();
  if (!fb) return;

  try {
    await fb.messaging().unsubscribeFromTopic([cleanToken], `user_${userId}`);
    await fb.messaging().unsubscribeFromTopic([cleanToken], "admins");
  } catch (err) {
    console.error(`[FCM] Error unsubscribing token:`, err);
  }
};

/**
 * 🔍 Get all active tokens for a list of user IDs
 */
export const getUserTokens = (userIds: string[]): string[] => {
  const result: string[] = [];
  for (const uid of userIds) {
    const set = userTokensStore.get(uid);
    if (set) {
      result.push(...Array.from(set));
    }
  }
  return result;
};

/**
 * 📢 Send a Push Notification to a topic (e.g. 'admins', 'user_123', 'engineer')
 */
export const sendTopicNotification = async (
  topic: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> => {
  const fb = getFirebaseAdmin();
  if (!fb) return false;

  try {
    const stringifiedData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) {
          stringifiedData[k] = typeof v === "string" ? v : JSON.stringify(v);
        }
      }
    }

    const message: admin.messaging.Message = {
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
  } catch (error) {
    console.error(`[FCM Topic: ${topic}] ❌ Error sending notification:`, error);
    return false;
  }
};

/**
 * 📲 Send a Push Notification to specific device tokens (Multicast)
 */
export const sendPushNotification = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  const fb = getFirebaseAdmin();
  if (!fb) return;

  if (!tokens || tokens.length === 0) {
    return;
  }

  // Remove duplicates and empty tokens
  const cleanTokens = Array.from(new Set(tokens.filter((t) => typeof t === "string" && t.trim().length > 0)));
  if (cleanTokens.length === 0) return;

  try {
    const stringifiedData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) {
          stringifiedData[k] = typeof v === "string" ? v : JSON.stringify(v);
        }
      }
    }

    const message: admin.messaging.MulticastMessage = {
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
  } catch (error) {
    console.error("[FCM Multicast] ❌ Error sending notification:", error);
  }
};
