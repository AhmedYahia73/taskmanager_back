// src/socket.ts

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";

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
export const sendNotificationToAdmins = (payload: any) => {
  if (!io) return;
  io.to("admins").emit("new_notification", {
    ...payload,
    target: "admin",
  });
};

// 🔒 Send ONLY to the specific user's room — NEVER broadcast with io.emit
export const sendNotificationToUser = (userId: string, payload: any) => {
  if (!io || !userId) return;
  io.to(`user_${userId}`).emit("new_notification", {
    ...payload,
    user_id: userId,
    target: payload.target || "user",
  });
};
