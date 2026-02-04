/**
 * Custom Error Classes
 * Standardized error handling for the application
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors?: any[];

  constructor(message: string, errors?: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Safely stringify a value, handling circular references and non-serializable objects.
 * Returns a string representation or a fallback message.
 */
function safeStringify(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  try {
    // For primitives, just return as-is
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    // For objects, try to stringify
    return JSON.stringify(value);
  } catch {
    return "[Could not serialize - circular or complex object]";
  }
}

/**
 * Coerce a value to a JSON-serializable primitive (string, number, boolean, null).
 * Never returns objects - prevents circular refs in output.
 */
function toPrimitive(val: unknown): string | number | boolean | null | undefined {
  if (val === null || val === undefined) return val;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  return String(val);
}

/**
 * Extract Meta API error details from response data.
 * Meta returns errors in a specific format: { error: { message, type, code, error_subcode, fbtrace_id } }
 * Returns only primitives to guarantee no circular refs.
 */
function extractMetaError(data: unknown): Record<string, string | number | boolean | null | undefined> | undefined {
  if (!data || typeof data !== "object") return undefined;

  const d = data as Record<string, unknown>;

  // Meta error format: { error: { message, type, code, ... } }
  if (d.error && typeof d.error === "object") {
    const metaErr = d.error as Record<string, unknown>;
    const result: Record<string, string | number | boolean | null | undefined> = {};
    if (metaErr.message !== undefined) result.metaMessage = toPrimitive(metaErr.message) as string;
    if (metaErr.type !== undefined) result.metaType = toPrimitive(metaErr.type) as string;
    if (metaErr.code !== undefined) result.metaCode = toPrimitive(metaErr.code) as number;
    if (metaErr.error_subcode !== undefined) result.metaSubcode = toPrimitive(metaErr.error_subcode) as number;
    if (metaErr.fbtrace_id !== undefined) result.metaTraceId = toPrimitive(metaErr.fbtrace_id) as string;
    return Object.keys(result).length > 0 ? result : undefined;
  }

  // If it's a simple object with a message field
  if (d.message !== undefined) {
    return { metaMessage: toPrimitive(d.message) as string };
  }

  // Fallback: try to stringify the whole thing
  const stringified = safeStringify(data);
  return stringified ? { metaRaw: stringified } : undefined;
}

/**
 * Serialize an error for logging.
 * Error objects and Axios errors don't JSON.stringify well (non-enumerable props, circular refs).
 * This extracts useful fields for structured logging.
 * 
 * IMPORTANT: This function NEVER throws. All outputs are JSON-serializable primitives.
 */
export function serializeErrorForLog(err: unknown): Record<string, unknown> {
  try {
    if (err === null || err === undefined) {
      return { errorType: "null" };
    }

    // Axios error - includes Meta API response
    if (
      typeof err === "object" &&
      "isAxiosError" in err &&
      (err as { isAxiosError?: boolean }).isAxiosError === true
    ) {
      const axiosErr = err as {
        message?: string;
        response?: { status?: number; statusText?: string; data?: unknown };
        request?: unknown;
        code?: string;
      };

      const result: Record<string, unknown> = {
        errorType: "AxiosError",
        message: axiosErr.message || "Unknown Axios error",
        code: axiosErr.code,
      };

      // Add response info if available (API returned a response)
      if (axiosErr.response) {
        result.httpStatus = axiosErr.response.status;
        result.httpStatusText = axiosErr.response.statusText;
        
        // Extract Meta-specific error details safely
        const metaDetails = extractMetaError(axiosErr.response.data);
        if (metaDetails) {
          Object.assign(result, metaDetails);
        }
      } else if (axiosErr.request) {
        // Request was made but no response received (network error, timeout, etc.)
        result.noResponse = true;
        result.hint = "Request sent but no response - check network/timeout/DNS";
      }

      return result;
    }

    // Standard Error object
    if (err instanceof Error) {
      return {
        errorType: err.name || "Error",
        message: err.message,
        stack: err.stack?.split("\n").slice(0, 3).join(" | "),
      };
    }

    // Unknown type - stringify safely
    return { errorType: "unknown", raw: safeStringify(err) || String(err) };
  } catch (serializationError) {
    // Last resort - even our serialization failed
    return {
      errorType: "SerializationFailed",
      message: "Failed to serialize the original error",
      hint: serializationError instanceof Error ? serializationError.message : "Unknown",
    };
  }
}
