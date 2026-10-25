"use strict";
// src/socket.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToUser = exports.sendNotificationToAdmins = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
const initSocket = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        },
    });
    io.on("connection", (socket) => {
        // Client can emit "join" with their user info
        socket.on("join", (data) => {
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
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
};
exports.getIO = getIO;
const sendNotificationToAdmins = (payload) => {
    if (!io)
        return;
    // Send to admins room and broadcast event
    io.to("admins").emit("new_notification", payload);
    io.emit("admin_notification", payload);
};
exports.sendNotificationToAdmins = sendNotificationToAdmins;
const sendNotificationToUser = (userId, payload) => {
    if (!io)
        return;
    // Send to specific user's room and broadcast with user-specific event
    io.to(`user_${userId}`).emit("new_notification", payload);
    io.emit(`notification_user_${userId}`, payload);
};
exports.sendNotificationToUser = sendNotificationToUser;
