// src/socket.ts

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  io.on("connection", (socket: Socket) => {
    // Client can emit "join" with their user info
    socket.on("join", (data: { userId?: string; role?: string }) => {
      if (data?.userId) {
        socket.join(`user_${data.userId}`);
      }
      if (data?.role === "admin" || data?.role === "super_admin") {
        socket.join("admins");
      }
    });

    socket.on("disconnect", () => {
      // Socket disconnected
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

export const sendNotificationToAdmins = (payload: any) => {
  if (!io) return;
  // Send to admins room and broadcast event
  io.to("admins").emit("new_notification", payload);
  io.emit("admin_notification", payload);
};

export const sendNotificationToUser = (userId: string, payload: any) => {
  if (!io) return;
  // Send to specific user's room and broadcast with user-specific event
  io.to(`user_${userId}`).emit("new_notification", payload);
  io.emit(`notification_user_${userId}`, payload);
};
