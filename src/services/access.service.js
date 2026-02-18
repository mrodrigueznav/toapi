/**
 * Authorization and tenant access rules.
 */
import { ApiError, ErrorCodes } from '../utils/errors.js';
import { findEmpresaById, findSucursalByIdAndEmpresa } from '../repositories/empresa.repo.js';
import { getUserEmpresaIds, getUserSucursalIdsByEmpresa } from '../repositories/user.repo.js';

/**
 * Check tenant access for empresaId + sucursalId. Throws if invalid.
 */
export async function checkTenantAccess(user, empresaId, sucursalId) {
  const empresa = await findEmpresaById(empresaId);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  if (!empresa.isActive) throw new ApiError(403, ErrorCodes.FORBIDDEN, 'Empresa is inactive');

  const sucursal = await findSucursalByIdAndEmpresa(sucursalId, empresaId);
  if (!sucursal) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Sucursal not found');
  if (!sucursal.isActive) throw new ApiError(403, ErrorCodes.FORBIDDEN, 'Sucursal is inactive');

  if (user.isAdmin) return;

  const userEmpresaIds = await getUserEmpresaIds(user.id);
  if (!userEmpresaIds.includes(empresaId)) {
    throw new ApiError(403, ErrorCodes.FORBIDDEN, 'No access to this empresa');
  }
  const sucursalesByEmpresa = await getUserSucursalIdsByEmpresa(user.id);
  const assignedSucursales = sucursalesByEmpresa[empresaId];
  if (assignedSucursales === undefined || assignedSucursales === null) {
    return;
  }
  if (Array.isArray(assignedSucursales) && assignedSucursales.length === 0) {
    return;
  }
  if (assignedSucursales && !assignedSucursales.includes(sucursalId)) {
    throw new ApiError(403, ErrorCodes.FORBIDDEN, 'No access to this sucursal');
  }
}

/**
 * Get list of empresa IDs the user can access (admin: all; user: assigned).
 */
export async function getAccessibleEmpresaIds(user, allEmpresaIds) {
  if (user.isAdmin) return allEmpresaIds;
  return getUserEmpresaIds(user.id);
}

/**
 * Get allowed sucursal IDs for listing capturas per empresa.
 * Returns { [empresaId]: null | [sucursalId...] } where null means all sucursales.
 */
export async function getAccessibleSucursalesForList(user, empresaIds) {
  if (user.isAdmin) return null;
  const byEmpresa = await getUserSucursalIdsByEmpresa(user.id);
  const result = {};
  for (const empId of empresaIds) {
    const list = byEmpresa[empId];
    if (list === undefined || (Array.isArray(list) && list.length === 0)) {
      result[empId] = null;
    } else {
      result[empId] = list;
    }
  }
  return result;
}

/**
 * Get flat list of (empresaId, sucursalId) pairs for captura list filter.
 * Admin: no filter. User: only allowed pairs.
 */
export async function getAccessibleCapturaScope(user) {
  if (user.isAdmin) return { isAdmin: true };
  const empresaIds = await getUserEmpresaIds(user.id);
  const sucursalesByEmpresa = await getUserSucursalIdsByEmpresa(user.id);
  const allowedSucursalIds = new Set();
  for (const empId of empresaIds) {
    const sucIds = sucursalesByEmpresa[empId];
    if (sucIds === undefined || (Array.isArray(sucIds) && sucIds.length === 0)) {
      const { findSucursalesByEmpresaId } = await import('../repositories/empresa.repo.js');
      const sucursales = await findSucursalesByEmpresaId(empId, { isActive: true });
      sucursales.forEach(s => allowedSucursalIds.add(s.id));
    } else {
      (sucIds || []).forEach(id => allowedSucursalIds.add(id));
    }
  }
  return { isAdmin: false, allowedEmpresaIds: empresaIds, allowedSucursalIds: [...allowedSucursalIds] };
}
