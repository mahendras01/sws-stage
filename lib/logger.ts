import { randomUUID } from "node:crypto";

/**
 * Structured, single-line JSON logger for troubleshooting user issues.
 *
 * Example (searchable with grep, e.g. `grep '"event":"auth.signup.' server.log`):
 *   {"ts":"2026-10-08T10:00:00.000Z","level":"info","event":"auth.signup.success","requestId":"a1b2c3d4","userId":"...","user":{...}}
 *
 * Privacy rules enforced here (so callers cannot leak by accident):
 *  - Passwords, tokens, secrets, hashes, cookies and authorization values are ALWAYS replaced by "[REDACTED]".
 *  - Aadhaar, PAN, bank account numbers and other user details are logged in full by default so issues can be
 *    traced to an exact record. Set LOG_MASK_SENSITIVE=true to mask Aadhaar/PAN/bank account numbers (last 4
 *    characters kept) and to scrub long digit runs / PAN-like values from error text.
 *
 * NOTE: full Aadhaar/PAN/bank numbers in log files are personal data. Restrict access to the logs and set a
 * retention period.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFields = Record<string, unknown>;

const REDACT_KEY = /pass(word)?|token|secret|authorization|cookie|hash|otp|cvv|api[_-]?key|session/i;
const AADHAAR_KEY = /aadh?a+r/i;
const PAN_KEY = /(^|_)pan(_|$)/i;
const ACCOUNT_KEY = /account/i;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function maskingEnabled(): boolean {
  return (process.env.LOG_MASK_SENSITIVE ?? "").toLowerCase() === "true";
}

function activeLevel(): number {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVEL_ORDER[configured] ?? LEVEL_ORDER.info;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function maskKeepingLast(value: string, keep: number) {
  if (value.length <= keep) {
    return "*".repeat(value.length);
  }
  return `${"*".repeat(value.length - keep)}${value.slice(-keep)}`;
}

/** Full value by default; with LOG_MASK_SENSITIVE=true: 123456789012 -> ********9012 */
export function maskAadhaar(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (!maskingEnabled() || text.includes("*")) return text;
  const raw = digitsOnly(text);
  return raw ? maskKeepingLast(raw, 4) : undefined;
}

/** Full value by default; with LOG_MASK_SENSITIVE=true: ABCDE1234F -> ******234F */
export function maskPan(value: unknown): string | undefined {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return undefined;
  if (!maskingEnabled() || text.includes("*")) return text;
  return maskKeepingLast(text, 4);
}

/** Full value by default; with LOG_MASK_SENSITIVE=true: 123456789012 -> ********9012 */
export function maskAccountNumber(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  if (!maskingEnabled() || text.includes("*")) return text;
  const raw = digitsOnly(text);
  return raw ? maskKeepingLast(raw, 4) : undefined;
}

/** With LOG_MASK_SENSITIVE=true, removes sensitive-looking values from free text (error messages, details). */
export function scrubText(text: string): string {
  if (!maskingEnabled()) {
    return text;
  }
  return text
    .replace(/\b[A-Za-z]{5}\d{4}[A-Za-z]\b/g, (match) => maskKeepingLast(match.toUpperCase(), 4))
    .replace(/\b\d{9,18}\b/g, (match) => maskKeepingLast(match, 4));
}

export function serializeError(error: unknown): LogFields | undefined {
  if (!error) {
    return undefined;
  }

  if (typeof error === "string") {
    return { message: scrubText(error) };
  }

  if (typeof error === "object") {
    const source = error as Record<string, unknown>;
    const result: LogFields = {};

    for (const key of ["name", "message", "code", "detail", "hint", "constraint", "table", "column", "severity"]) {
      const value = source[key];
      if (value !== undefined && value !== null && value !== "") {
        result[key] = typeof value === "string" ? scrubText(value) : value;
      }
    }

    if (error instanceof Error && error.stack) {
      // Keep only the first frames; stacks are useful for locating the failing code path.
      result.stack = scrubText(error.stack.split("\n").slice(0, 4).join(" | "));
    }

    return Object.keys(result).length > 0 ? result : { message: scrubText(String(error)) };
  }

  return { message: scrubText(String(error)) };
}

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (value === undefined || typeof value === "function") {
    return undefined;
  }

  // Validation error maps ({ field: "message" }): keep the messages, only scrub them for sensitive-looking values.
  if (key === "errors" && value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([field, message]) => [
        field,
        typeof message === "string" ? scrubText(message) : String(message),
      ]),
    );
  }

  if (key) {
    if (REDACT_KEY.test(key)) {
      return "[REDACTED]";
    }
    if (typeof value === "string" || typeof value === "number") {
      if (AADHAAR_KEY.test(key)) return maskAadhaar(value);
      if (PAN_KEY.test(key)) return maskPan(value);
      if (ACCOUNT_KEY.test(key)) return maskAccountNumber(value);
    }
  }

  if (key && /error$/i.test(key) && value && typeof value === "object" && !Array.isArray(value)) {
    return serializeError(value);
  }

  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (depth >= 4) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitize(item, key, depth + 1));
  }

  if (typeof value === "object") {
    const output: LogFields = {};
    for (const [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitize(childValue, childKey, depth + 1);
      if (sanitized !== undefined) {
        output[childKey] = sanitized;
      }
    }
    return output;
  }

  return String(value);
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  if (LEVEL_ORDER[level] < activeLevel()) {
    return;
  }

  let line: string;
  try {
    line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      ...(sanitize(fields) as LogFields),
    });
  } catch {
    line = JSON.stringify({ ts: new Date().toISOString(), level, event, logError: "failed to serialize log fields" });
  }

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (event: string, fields?: LogFields) => logEvent("debug", event, fields),
  info: (event: string, fields?: LogFields) => logEvent("info", event, fields),
  warn: (event: string, fields?: LogFields) => logEvent("warn", event, fields),
  error: (event: string, fields?: LogFields) => logEvent("error", event, fields),
};

export function newRequestId() {
  return randomUUID().slice(0, 8);
}

/** Common request metadata: requestId (for correlating lines), method, path and client IP. */
export function getRequestMeta(request: Request): LogFields {
  let path = "";
  try {
    path = new URL(request.url).pathname;
  } catch {
    // ignore malformed URL
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") ?? undefined;

  return { requestId: newRequestId(), method: request.method, path, ip };
}

function pick(source: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return typeof value === "string" ? value.trim() : value;
    }
  }
  return undefined;
}

/**
 * Builds a troubleshooting summary from a user record or signup/profile payload.
 * Only fields that are present are included. Aadhaar/PAN/bank values are masked only if LOG_MASK_SENSITIVE=true.
 */
export function summarizeUser(input: object | null | undefined): LogFields {
  if (!input) {
    return {};
  }
  const source = input as Record<string, unknown>;

  const summary: LogFields = {
    userId: pick(source, "id", "user_id"),
    serialNo: pick(source, "serial_no", "serial_number", "role_number"),
    name: pick(source, "name"),
    email: pick(source, "email"),
    mobile: pick(source, "phone_number", "mobile_number", "phone"),
    ehrmsCode: pick(source, "ehrms_code"),
    aadhaar: maskAadhaar(pick(source, "aadhar_number")),
    pan: maskPan(pick(source, "pan_number")),
    nomineeAadhaar: maskAadhaar(pick(source, "nominee_aadhar_number")),
    status: pick(source, "status"),
    role: pick(source, "role"),
  };

  const bank = {
    holderName: pick(source, "bank_holder_name"),
    accountNumber: maskAccountNumber(pick(source, "bank_account_number")),
    ifsc: pick(source, "bank_ifsc_code"),
  };
  if (Object.values(bank).some((value) => value !== undefined)) {
    summary.bank = bank;
  }

  const address = {
    houseFlatNo: pick(source, "house_flat_no"),
    streetLocality: pick(source, "street_locality"),
    landmark: pick(source, "landmark"),
    villageCity: pick(source, "village_city"),
    district: pick(source, "district"),
    state: pick(source, "state"),
    pincode: pick(source, "pincode"),
    country: pick(source, "country"),
  };
  if (Object.values(address).some((value) => value !== undefined)) {
    summary.address = address;
  }

  const permanentAddress = {
    houseFlatNo: pick(source, "permanent_house_flat_no"),
    streetLocality: pick(source, "permanent_street_locality"),
    landmark: pick(source, "permanent_landmark"),
    villageCity: pick(source, "permanent_village_city"),
    district: pick(source, "permanent_district"),
    state: pick(source, "permanent_state"),
    pincode: pick(source, "permanent_pincode"),
    country: pick(source, "permanent_country"),
  };
  if (Object.values(permanentAddress).some((value) => value !== undefined)) {
    summary.permanentAddress = permanentAddress;
  }

  for (const key of Object.keys(summary)) {
    if (summary[key] === undefined) {
      delete summary[key];
    }
  }

  return summary;
}
