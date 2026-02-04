import Redis from "ioredis";
import logger from "../../../config/logger";
import { whatsappConfig } from "../config";
import { WhatsAppSession } from "../types";

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const ERROR_LOG_THROTTLE_MS = 30000; // Log Redis errors at most once per 30 seconds

/**
 * In-memory session store for development/fallback.
 * Not suitable for production with multiple server instances.
 */
class InMemoryStore {
  private store = new Map<
    string,
    { value: WhatsAppSession; expiresAt: number }
  >();

  constructor(private ttlSeconds: number) {}

  async get(key: string): Promise<WhatsAppSession | null> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: WhatsAppSession): Promise<void> {
    const expiresAt = Date.now() + this.ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

/**
 * Redis-based session store for production.
 * Handles connection failures gracefully without throwing.
 */
class RedisStore {
  private client: Redis;
  private ttlSeconds: number;
  private isHealthy: boolean = false;
  private lastErrorLogAt: number = 0;

  constructor(url: string, ttlSeconds: number) {
    this.ttlSeconds = ttlSeconds;
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1, // Fail fast, don't block webhook
      retryStrategy: (times) => {
        // Exponential backoff: 1s, 2s, 4s, max 30s
        const delay = Math.min(times * 1000, 30000);
        return delay;
      },
      reconnectOnError: (err) => {
        // Reconnect on specific errors
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
    });

    this.client.on("connect", () => {
      this.isHealthy = true;
      logger.info("Redis session store connected");
    });

    this.client.on("ready", () => {
      this.isHealthy = true;
    });

    this.client.on("error", (err) => {
      this.isHealthy = false;
      // Throttle error logging to prevent log spam
      const now = Date.now();
      if (now - this.lastErrorLogAt > ERROR_LOG_THROTTLE_MS) {
        this.lastErrorLogAt = now;
        logger.error("Redis session store error (throttled)", {
          message: err.message,
          code: (err as any).code,
        });
      }
    });

    this.client.on("close", () => {
      this.isHealthy = false;
    });

    this.client.on("end", () => {
      this.isHealthy = false;
    });
  }

  /**
   * Check if Redis is healthy and ready for operations.
   */
  get healthy(): boolean {
    return this.isHealthy && this.client.status === "ready";
  }

  /**
   * Attempt to connect if not already connected.
   * Returns false if connection fails (does not throw).
   */
  private async tryConnect(): Promise<boolean> {
    try {
      // Store status to avoid TypeScript narrowing issues after async operations
      const status = this.client.status;

      if (status === "ready") {
        return true;
      }

      if (status === "end") {
        // Connection permanently closed, cannot reconnect
        return false;
      }

      if (status === "wait") {
        // Initial state - need to connect
        await this.client.connect();
        // Re-check status after connect attempt
        return this.client.status === "ready";
      }

      if (status === "connecting" || status === "reconnecting") {
        // Already trying to connect - check health flag instead
        // The event handlers will set isHealthy when ready
        return this.isHealthy;
      }

      // "connect" or "close" states - not ready
      return false;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<WhatsAppSession | null> {
    if (!(await this.tryConnect())) {
      return null; // Graceful fallback
    }
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as WhatsAppSession;
    } catch (err) {
      // Don't throw - return null and let caller handle
      return null;
    }
  }

  async set(key: string, value: WhatsAppSession): Promise<void> {
    if (!(await this.tryConnect())) {
      return; // Graceful degradation - session won't persist but won't crash
    }
    try {
      await this.client.set(key, JSON.stringify(value), "EX", this.ttlSeconds);
    } catch {
      // Silently fail - better than crashing webhook
    }
  }

  async del(key: string): Promise<void> {
    if (!(await this.tryConnect())) {
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      // Silently fail
    }
  }
}

type Store = InMemoryStore | RedisStore;

/**
 * Session store with automatic fallback behavior.
 * - Uses Redis if configured and healthy
 * - Falls back to in-memory if Redis unavailable
 * - Never throws errors to caller (graceful degradation)
 */
class SessionStore {
  private primaryStore: Store | null = null;
  private fallbackStore: InMemoryStore;
  private ttlSeconds: number;
  private useRedis: boolean;

  constructor(ttlSeconds: number = DEFAULT_TTL_SECONDS) {
    this.ttlSeconds = ttlSeconds;
    this.fallbackStore = new InMemoryStore(ttlSeconds);
    this.useRedis = Boolean(whatsappConfig.redisUrl);

    if (this.useRedis) {
      try {
        this.primaryStore = new RedisStore(
          whatsappConfig.redisUrl!,
          ttlSeconds
        );
        logger.info(
          "WhatsApp session store initialized with Redis (with fallback)"
        );
      } catch (err) {
        logger.error(
          "Failed to initialize Redis store, using in-memory only",
          err
        );
        this.primaryStore = null;
        this.useRedis = false;
      }
    } else {
      logger.warn(
        "WhatsApp session store using in-memory only (REDIS_URL not set)"
      );
    }
  }

  private key(user: string): string {
    return `wa:session:${user}`;
  }

  /**
   * Get the active store (Redis if healthy, otherwise fallback).
   */
  private getActiveStore(): Store {
    if (this.primaryStore && this.primaryStore instanceof RedisStore) {
      if (this.primaryStore.healthy) {
        return this.primaryStore;
      }
    }
    return this.primaryStore || this.fallbackStore;
  }

  /**
   * Get session for a user. Returns null if not found or on error.
   * Never throws.
   */
  async getSession(user: string): Promise<WhatsAppSession | null> {
    try {
      const store = this.getActiveStore();
      return await store.get(this.key(user));
    } catch (err) {
      logger.error("SessionStore.getSession failed", { user, error: err });
      return null;
    }
  }

  /**
   * Save session for a user. Fails silently on error.
   * Never throws.
   */
  async saveSession(session: WhatsAppSession): Promise<void> {
    try {
      const next = { ...session, lastMessageAt: Date.now() };
      const store = this.getActiveStore();
      await store.set(this.key(session.user), next);
    } catch (err) {
      logger.error("SessionStore.saveSession failed", {
        user: session.user,
        error: err,
      });
      // Don't throw - let the webhook continue
    }
  }

  /**
   * Clear session for a user. Fails silently on error.
   * Never throws.
   */
  async clearSession(user: string): Promise<void> {
    try {
      const store = this.getActiveStore();
      await store.del(this.key(user));
      logger.info("Session cleared for user", {
        service: "grievance-aid-backend",
        user,
      });
    } catch (err) {
      logger.error("SessionStore.clearSession failed", { user, error: err });
      // Don't throw
    }
  }
}

export const sessionStore = new SessionStore();
