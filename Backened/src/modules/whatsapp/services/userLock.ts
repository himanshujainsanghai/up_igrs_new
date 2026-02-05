/**
 * Per-user lock for WhatsApp message processing.
 * Ensures only one message per user is processed at a time, preventing
 * lost updates when multiple docs (or DONE) are sent in quick succession.
 *
 * - With Redis: uses SET key NX EX for acquire, DEL for release.
 * - Without Redis: in-memory queue per user (single-instance only).
 */

import Redis from "ioredis";
import logger from "../../../config/logger";
import { whatsappConfig } from "../config";

const LOCK_PREFIX = "wa:lock:";
const LOCK_TTL_SECONDS = 60;
const MAX_WAIT_MS = 45_000;
const RETRY_INTERVAL_MS = 300;
/** Max time to wait for Redis to connect on first use (avoids 45s spin when lazyConnect was never triggered). */
const CONNECT_TIMEOUT_MS = 5_000;

/** In-memory: queue of resolvers per user. First in queue holds the lock. */
const memoryQueues = new Map<string, Array<() => void>>();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Acquire lock for user (in-memory). Resolves when lock is held. */
async function acquireMemory(userId: string): Promise<void> {
  return new Promise((resolve) => {
    let q = memoryQueues.get(userId);
    if (!q) {
      q = [];
      memoryQueues.set(userId, q);
    }
    q.push(resolve);
    if (q.length === 1) resolve();
  });
}

/** Release lock for user (in-memory). */
function releaseMemory(userId: string): void {
  const q = memoryQueues.get(userId);
  if (!q) return;
  q.shift();
  if (q.length > 0) q[0]!();
  else memoryQueues.delete(userId);
}

/** Redis client for lock (lazy, only when redisUrl is set). */
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!whatsappConfig.redisUrl) return null;
  if (redisClient) return redisClient;
  try {
    redisClient = new Redis(whatsappConfig.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => Math.min(times * 500, 5000),
    });
    redisClient.on("error", (err) => {
      logger.warn("WhatsApp userLock Redis error", { message: err.message });
    });
    return redisClient;
  } catch {
    return null;
  }
}

/**
 * Ensure the lock Redis client is connected. With lazyConnect, the client never
 * connects until connect() or a command is used; the previous loop only checked
 * status and slept, so it never connected and waited the full 45s. We now
 * connect once with a bounded timeout so the first request is fast.
 */
async function ensureLockRedisReady(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  if (client.status === "ready") return true;

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      client.removeListener("ready", onReady);
      client.removeListener("error", onError);
      resolve(false);
    }, CONNECT_TIMEOUT_MS);

    const onReady = () => {
      clearTimeout(timeout);
      client.removeListener("error", onError);
      resolve(true);
    };

    const onError = () => {
      // Connection failed; timeout will resolve false
    };

    client.once("ready", onReady);
    client.once("error", onError);

    if (client.status === "wait" || client.status === "close") {
      client.connect().catch(() => {});
    }
  });
}

/** Acquire lock for user (Redis). Retries until MAX_WAIT_MS. Returns true if acquired. */
async function acquireRedis(userId: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  if (!(await ensureLockRedisReady())) return false;

  const key = `${LOCK_PREFIX}${userId}`;
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    try {
      const ok = await client.set(key, "1", "EX", LOCK_TTL_SECONDS, "NX");
      if (ok === "OK" || ok === true) return true;
    } catch {
      // Transient error; retry
    }
    await sleep(RETRY_INTERVAL_MS);
  }
  return false;
}

/** Release lock for user (Redis). */
async function releaseRedis(userId: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  const key = `${LOCK_PREFIX}${userId}`;
  try {
    if (client.status === "ready") await client.del(key);
  } catch (err) {
    logger.warn("WhatsApp userLock release failed", { userId, err });
  }
}

const useRedis = Boolean(whatsappConfig.redisUrl);

/**
 * Run fn with exclusive per-user lock. Ensures messages for the same user
 * are processed one at a time. Waits up to MAX_WAIT_MS to acquire the lock.
 * Always releases the lock in finally.
 */
export async function withUserLock<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  if (useRedis) {
    const acquired = await acquireRedis(userId);
    if (!acquired) {
      logger.warn("WhatsApp userLock acquire timeout", {
        userId,
        maxWaitMs: MAX_WAIT_MS,
      });
      // Run anyway to avoid dropping the message; session race still possible
    }
    try {
      return await fn();
    } finally {
      await releaseRedis(userId);
    }
  }
  await acquireMemory(userId);
  try {
    return await fn();
  } finally {
    releaseMemory(userId);
  }
}
