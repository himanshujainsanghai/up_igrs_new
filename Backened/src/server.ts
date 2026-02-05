import http from "http";
import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import logger from "./config/logger";
import { initNotificationSocket } from "./modules/notifications/socket";

/**
 * Server Entry Point
 * Connects to database, attaches Socket.IO for real-time notifications, and starts the HTTP server.
 */

const PORT = env.PORT || 5000;

// Connect to database and start server
const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const httpServer = http.createServer(app);
    initNotificationSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  logger.error("UNHANDLED REJECTION! Shutting down...", err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...", err);
  process.exit(1);
});

// Start the server
startServer();
