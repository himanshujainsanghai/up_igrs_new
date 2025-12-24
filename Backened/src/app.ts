import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { env } from "./config/env";
import logger from "./config/logger";

/**
 * Express Application Setup
 * Configures middleware and routes
 */
const app: Application = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting - More lenient for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 login attempts per 15 minutes
  message: "Too many login attempts from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// General rate limiting for other API routes (excluding auth)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for auth routes (they have their own limiter)
    return req.path.startsWith('/api/v1/auth');
  },
});

// Apply auth rate limiter to auth routes FIRST
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// Apply general rate limiter to all other API routes (auth routes are skipped)
app.use("/api/", apiLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
import complaintsRoutes from "./routes/complaints.routes";
import meetingsRoutes from "./routes/meetings.routes";
import inventoryRoutes from "./routes/inventory.routes";
import authRoutes from "./routes/auth.routes";
import aiRoutes from "./routes/ai.routes";
import uploadRoutes from "./routes/upload.routes";
import feedbackRoutes from "./routes/feedback.routes";
import otpRoutes from "./routes/otp.routes";
import reportsRoutes from "./routes/reports.routes";
import locationRoutes from "./routes/location.routes";
import documentsRoutes from "./routes/documents.routes";
import testRoutes from "./routes/test.routes";
import geoRoutes from "./routes/geo.routes";
import villageRoutes from "./routes/village.routes";
import districtRoutes from "./routes/district.routes";
import demographicsRoutes from "./routes/demographics.routes";
import usersRoutes from "./routes/users.routes";

app.use("/api/v1/complaints", complaintsRoutes);
app.use("/api/v1/meetings", meetingsRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/location", locationRoutes);
app.use("/api/v1/documents", documentsRoutes);
app.use("/api/v1/test", testRoutes);
app.use("/api/v1/geo", geoRoutes);
app.use("/api/v1/villages", villageRoutes);
app.use("/api/v1/districts", districtRoutes);
app.use("/api/v1/demographics", demographicsRoutes);
app.use("/api/v1/users", usersRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
