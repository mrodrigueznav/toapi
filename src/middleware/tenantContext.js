/**
 * Extract/validate empresaId/sucursalId and enforce tenant membership.
 */
import { z } from 'zod';
import { ApiError, ErrorCodes } from '../utils/errors.js';
import { checkTenantAccess } from '../services/access.service.js';

const uuidSchema = z.string().uuid();

export async function tenantContext(req, res, next) {
  try {
    const empresaIdRaw = req.get('x-empresa-id');
    const sucursalIdRaw = req.get('x-sucursal-id');
    const empresaResult = uuidSchema.safeParse(empresaIdRaw);
    const sucursalResult = uuidSchema.safeParse(sucursalIdRaw);
    if (!empresaResult.success || !sucursalResult.success) {
      throw new ApiError(400, ErrorCodes.TENANT_INVALID, 'Valid x-empresa-id and x-sucursal-id (UUID) required');
    }
    const empresaId = empresaResult.data;
    const sucursalId = sucursalResult.data;
    await checkTenantAccess(req.user, empresaId, sucursalId);
    req.tenant = { empresaId, sucursalId };
    next();
  } catch (err) {
    next(err);
  }
}

export default tenantContext;
