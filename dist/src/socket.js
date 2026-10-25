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
        console.log(`[Socket.IO] Client connected: ${socket.id}`);
        // Client emits "join" with their user info
        socket.on("join", (data) => {
            if (data?.userId) {
                socket.join(`user_${data.userId}`);
                console.log(`[Socket.IO] User ${data.userId} joined room user_${data.userId}`);
            }
            if (data?.role === "admin" || data?.role === "super_admin") {
                socket.join("admins");
                console.log(`[Socket.IO] Admin socket ${socket.id} joined admins room`);
            }
        });
        socket.on("disconnect", (reason) => {
            console.log(`[Socket.IO] Client ${socket.id} disconnected: ${reason}`);
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
