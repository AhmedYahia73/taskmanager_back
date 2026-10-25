// src/socket.ts

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import {
  sendTopicNotification,
  sendPushNotification,
  getUserTokens,
  getAdminTokens,
  getNotificationTitle,
} from "./utils/firebase";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket: Socket) => {
    // Client emits "join" with their user info
    socket.on("join", (data: { userId?: string; role?: string }) => {
      const userId = data?.userId;
      const role = data?.role?.toLowerCase();

      if (userId) {
        // Leave any prior user room if user switched
        for (const room of socket.rooms) {
          if (room.startsWith("user_") && room !== `user_${userId}`) {
            socket.leave(room);
          }
        }
        socket.join(`user_${userId}`);
      }

      // ONLY actual admins join the 'admins' room
      if (role === "admin" || role === "super_admin") {
        socket.join("admins");
      } else {
        socket.leave("admins");
      }
    });

    socket.on("disconnect", () => {
      // client disconnected
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

// 🔒 Send ONLY to admins in the 'admins' room — NEVER broadcast with io.emit
// 🔔 Automatically dispatches to Firebase Cloud Messaging (FCM) to verified Admin device tokens ONLY
export const sendNotificationToAdmins = async (payload: any) => {
  if (io) {
    io.to("admins").emit("new_notification", {
      ...payload,
      target: "admin",
    });
  }

  // Dispatch to Firebase Cloud Messaging (FCM) strictly to verified Admin tokens
  try {
    const title = payload.title || getNotificationTitle(payload.type);
    const body = payload.description || payload.body || "New notification for admins";
    const link = payload.link || "/admin";

    const fcmData: Record<string, string> = {
      target: "admin",
      type: String(payload.type || "general"),
      link: String(link),
      ...(payload.task_id ? { task_id: String(payload.task_id) } : {}),
      ...(payload.updater_name ? { updater_name: String(payload.updater_name) } : {}),
      ...(payload.task_name ? { task_name: String(payload.task_name) } : {}),
      ...(payload.assigned_user ? { assigned_user: String(payload.assigned_user) } : {}),
      ...(payload.old_status ? { old_status: String(payload.old_status) } : {}),
      ...(payload.new_status ? { new_status: String(payload.new_status) } : {}),
    };

    // 🔒 Direct device push ONLY to verified Admin device tokens (no broad topic leakage)
    const adminTokens = await getAdminTokens();
    if (adminTokens.length > 0) {
      sendPushNotification(adminTokens, title, body, fcmData).catch((e) =>
        console.error("[FCM] Admin direct push error:", e)
      );
    }
  } catch (err) {
    console.error("[FCM] Error dispatching push in sendNotificationToAdmins:", err);
  }
};

// 🔒 Send ONLY to the specific user's room — NEVER broadcast with io.emit
// 🔔 Automatically dispatches to Firebase Cloud Messaging (FCM) to this specific user's tokens ONLY
export const sendNotificationToUser = async (userId: string, payload: any) => {
  if (!userId) return;

  if (io) {
    io.to(`user_${userId}`).emit("new_notification", {
      ...payload,
      user_id: userId,
      target: payload.target || "user",
    });
  }

  // Dispatch to Firebase Cloud Messaging (FCM) strictly to this user's registered tokens
  try {
    const title = payload.title || getNotificationTitle(payload.type);
    const body = payload.description || payload.body || "New notification";
    const link = payload.link || "/attendance";

    const fcmData: Record<string, string> = {
      target: "user",
      user_id: String(userId),
      type: String(payload.type || "general"),
      link: String(link),
    };

    // 🔒 Direct device push ONLY to this user's active device tokens (no leakage)
    const userTokens = getUserTokens([userId]);
    if (userTokens.length > 0) {
      sendPushNotification(userTokens, title, body, fcmData).catch((e) =>
        console.error(`[FCM] User ${userId} direct push error:`, e)
      );
    }
  } catch (err) {
    console.error(`[FCM] Error dispatching push in sendNotificationToUser:`, err);
  }
};
