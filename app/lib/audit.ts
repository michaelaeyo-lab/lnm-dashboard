/**
 * Structured audit logging for the LNM Dashboard.
 *
 * Logs security-relevant operations as JSON to stdout so they can be
 * captured by any log aggregator.  A future iteration can persist these
 * to a database audit table.
 */

export type AuditAction =
  | "generate_content"
  | "refine_content"
  | "search_knowledge"
  | "create_brief"
  | "login"
  | "export";

export interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource: string;
  metadata?: Record<string, unknown>;
}

/**
 * Emit a structured JSON audit log entry.
 *
 * @example
 * logOperation({
 *   userId: "usr_abc",
 *   action: "generate_content",
 *   resource: "/api/content/generate",
 *   metadata: { sessionId: "sess_123", sectionId: "sec_456" },
 * });
 */
export function logOperation(params: AuditLogParams): void {
  const entry = {
    _type: "audit",
    timestamp: new Date().toISOString(),
    userId: params.userId,
    action: params.action,
    resource: params.resource,
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  // Structured JSON log -- easy for log aggregators to parse
  console.log(JSON.stringify(entry));
}
