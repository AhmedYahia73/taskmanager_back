"use strict";
// src/socket.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToUser = exports.sendNotificationToAdmins = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        path: "/socket.io/",
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
            credentials: true,
        },
        transports: ["websocket", "polling"],
    });
    io.on("connection", (socket) => {
        // Client emits "join" with their user info
        socket.on("join", (data) => {
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
            }
            else {
                socket.leave("admins");
            }
        });
        socket.on("disconnect", () => {
            // client disconnected
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
};
exports.getIO = getIO;
// 🔒 Send ONLY to admins in the 'admins' room — NEVER broadcast with io.emit
const sendNotificationToAdmins = (payload) => {
    if (!io)
        return;
    io.to("admins").emit("new_notification", {
        ...payload,
        target: "admin",
    });
};
exports.sendNotificationToAdmins = sendNotificationToAdmins;
// 🔒 Send ONLY to the specific user's room — NEVER broadcast with io.emit
const sendNotificationToUser = (userId, payload) => {
    if (!io || !userId)
        return;
    io.to(`user_${userId}`).emit("new_notification", {
        ...payload,
        user_id: userId,
        target: payload.target || "user",
    });
};
exports.sendNotificationToUser = sendNotificationToUser;
