/**
 * Write audit logs for governance.
 */
import { createAuditLog } from '../repositories/audit.repo.js';

export async function logAudit({
  actorUserId = null,
  actorClerkUserId = null,
  action,
  entityType,
  entityId = null,
  empresaId = null,
  sucursalId = null,
  metadata = {},
  requestId = null,
  ip = null,
  userAgent = null,
}) {
  return createAuditLog({
    actorUserId,
    actorClerkUserId,
    action,
    entityType,
    entityId,
    empresaId,
    sucursalId,
    metadata,
    requestId,
    ip,
    userAgent,
  });
}

export default { logAudit };
