/**
 * NOTIFICATION MODULE - REAL-TIME SOCKET
 * Socket.IO: users join room by user_id; we emit "new_notification" to rooms when notifications are created.
 *
 * DEPENDENCY (add manually): socket.io
 *   Backend:  npm install socket.io
 *   Frontend: npm install socket.io-client
 */

import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { User } from "../../models/User";
import logger from "../../config/logger";

const NOTIFICATION_ROOM_PREFIX = "user_";
const EVENT_NEW_NOTIFICATION = "new_notification";

let io: import("socket.io").Server | null = null;

/**
 * Initialize Socket.IO on the HTTP server and set up auth + room join.
 * Call this from server.ts after creating the HTTP server.
 * No-op if socket.io is not installed.
 */
export function initNotificationSocket(
  httpServer: HttpServer
): import("socket.io").Server | null {
  let ServerConstructor: new (
    s: HttpServer,
    o?: object
  ) => import("socket.io").Server;
  try {
    const socketIoModule = require("socket.io");
    ServerConstructor = socketIoModule.Server;
    if (typeof ServerConstructor !== "function") {
      logger.warn(
        "socket.io Server not found; real-time notifications disabled"
      );
      return null;
    }
  } catch {
    logger.warn(
      "socket.io not installed; real-time notifications disabled. Add: npm install socket.io"
    );
    return null;
  }

  const origins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  io = new ServerConstructor(httpServer, {
    cors: {
      origin: origins.length ? origins : true,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.on("connection", (socket: import("socket.io").Socket) => {
    const token =
      (socket.handshake.auth?.token as string) ||
      (socket.handshake.headers?.authorization as string)?.replace(
        /^Bearer\s+/i,
        ""
      );

    if (!token) {
      logger.debug(
        "Notification socket: connection without token, disconnecting"
      );
      socket.disconnect(true);
      return;
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as {
        userId: string;
        email?: string;
        role?: string;
      };
      userId = decoded.userId;
    } catch (err) {
      logger.debug("Notification socket: invalid token, disconnecting");
      socket.disconnect(true);
      return;
    }

    User.findOne({ id: userId, isActive: true })
      .select("id")
      .lean()
      .then((user) => {
        if (!user) {
          socket.disconnect(true);
          return;
        }
        const room = `${NOTIFICATION_ROOM_PREFIX}${userId}`;
        socket.join(room);
        logger.debug(`Notification socket: user ${userId} joined room ${room}`);
      })
      .catch((err) => {
        logger.warn("Notification socket: user lookup failed", { userId, err });
        socket.disconnect(true);
      });
  });

  logger.info("Notification Socket.IO attached");
  return io;
}

/**
 * Emit "new_notification" to each user so clients can refetch count/list.
 * Call this after Notification.insertMany in the orchestrator.
 */
export function emitNewNotificationsToUsers(userIds: string[]): void {
  if (!io) return;
  const unique = [...new Set(userIds)];
  unique.forEach((userId) => {
    io!
      .to(`${NOTIFICATION_ROOM_PREFIX}${userId}`)
      .emit(EVENT_NEW_NOTIFICATION, {
        message: "New notification",
      });
  });
  logger.debug(`Notification socket: emitted to ${unique.length} user(s)`);
}

export function getNotificationIO(): import("socket.io").Server | null {
  return io;
}
