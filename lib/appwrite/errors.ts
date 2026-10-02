import "server-only";

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
  "user_more_factors_required", "user_session_not_found",
]);

/** Server logs only. Never log SDK messages/responses, credentials or user input. */
export function reportAppwriteFailure(operation: "auth.login" | "database.list", error: unknown): void {
  const { status, type } = backendDetails(error);
  console.error("[Appwrite] Operation failed", {
    operation,
    status,
    type: diagnosticTypes.has(type) ? type : "unknown",
  });
}
