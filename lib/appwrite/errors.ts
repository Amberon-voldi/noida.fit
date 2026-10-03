import "server-only";

import { randomUUID } from "node:crypto";

function backendDetails(error: unknown): { status: number; type: string } {
  if (!error || typeof error !== "object") return { status: 0, type: "unknown" };
  // Structural checks also support the SDK's separate ESM/CommonJS constructors.
  const status = "code" in error && typeof error.code === "number" && Number.isInteger(error.code) ? error.code : 0;
  const type = "type" in error && typeof error.type === "string" ? error.type : "unknown";
  return { status, type };
}

// Only this response from Appwrite means that the supplied password was rejected.
export function isInvalidCredentials(error: unknown): boolean {
  const { status, type } = backendDetails(error);
  return status === 401 && type === "user_invalid_credentials";
}

const diagnosticTypes = new Set([
  "general_unauthorized_scope", "user_unauthorized", "project_not_found",
  "project_unknown", "project_key_expired", "key_not_found",
  "database_not_found", "collection_not_found", "general_argument_invalid",
  "general_rate_limit_exceeded", "general_server_error", "user_blocked",
  "user_more_factors_required", "user_session_not_found", "user_invalid_credentials",
]);
const networkCodes = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"]);
type Operation = "auth.login" | "auth.session.create" | "auth.session.read" | "auth.profile.ensure" | "database.list" | "database.get";
// Callers supply only generated IDs, fixed collection aliases and elapsed time.
type DiagnosticContext = { traceId?: string; collection?: string; durationMs?: number };

/** Server logs only. Never log SDK messages/responses, credentials or user input. */
export function reportAppwriteFailure(operation: Operation, error: unknown, context: DiagnosticContext = {}): void {
  const { status, type } = backendDetails(error);
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : undefined;
  const candidate = cause && typeof cause === "object" && "code" in cause ? cause.code
    : error && typeof error === "object" && "code" in error ? error.code : undefined;
  console.error("[Appwrite] Operation failed", {
    operation,
    status,
    type: diagnosticTypes.has(type) ? type : "unknown",
    ...(context.traceId ? { traceId: context.traceId } : {}),
    ...(context.collection ? { collection: context.collection } : {}),
    ...(context.durationMs !== undefined ? { durationMs: context.durationMs } : {}),
    ...(typeof candidate === "string" && networkCodes.has(candidate) ? { networkCode: candidate } : {}),
  });
}

export async function traceAppwriteOperation<T>(
  operation: Operation,
  run: () => Promise<T>,
  context: Pick<DiagnosticContext, "traceId" | "collection"> = {},
): Promise<T> {
  const traceId = context.traceId ?? randomUUID();
  const details = { traceId, ...(context.collection ? { collection: context.collection } : {}) };
  const start = Date.now();
  console.info("[Appwrite] Operation started", { operation, ...details });
  try {
    const result = await run();
    console.info("[Appwrite] Operation completed", { operation, ...details, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    reportAppwriteFailure(operation, error, { ...details, durationMs: Date.now() - start });
    throw error;
  }
}
