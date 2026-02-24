import * as adminService from '../services/admin.service.js';
import { findAuditLogsList } from '../repositories/audit.repo.js';
import { getUserById as getUserIdFromRepo } from '../repositories/user.repo.js';
import { ApiError, ErrorCodes } from '../utils/errors.js';

function auditContext(req) {
  return {
    actorUserId: req.user?.id,
    actorClerkUserId: req.user?.clerkUserId,
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  };
}

export async function createEmpresa(req, res) {
  const empresa = await adminService.createEmpresa(req.body, auditContext(req));
  res.status(201).json(empresa);
}

export async function updateEmpresa(req, res) {
  const empresa = await adminService.updateEmpresa(req.params.id, req.body, auditContext(req));
  res.json(empresa);
}

export async function activateEmpresa(req, res) {
  const empresa = await adminService.activateEmpresa(req.params.id, auditContext(req));
  res.json(empresa);
}

export async function deactivateEmpresa(req, res) {
  const empresa = await adminService.deactivateEmpresa(req.params.id, auditContext(req));
  res.json(empresa);
}

export async function createSucursal(req, res) {
  const sucursal = await adminService.createSucursal(req.params.empresaId, req.body, auditContext(req));
  res.status(201).json(sucursal);
}

export async function updateSucursal(req, res) {
  const sucursal = await adminService.updateSucursal(req.params.id, req.body, auditContext(req));
  res.json(sucursal);
}

export async function activateSucursal(req, res) {
  const sucursal = await adminService.activateSucursal(req.params.id, auditContext(req));
  res.json(sucursal);
}

export async function deactivateSucursal(req, res) {
  const sucursal = await adminService.deactivateSucursal(req.params.id, auditContext(req));
  res.json(sucursal);
}

export async function createUser(req, res) {
  const user = await adminService.createUser(req.body, auditContext(req));
  res.status(201).json(user);
}

export async function listUsers(req, res) {
  const { query, limit, offset } = req.query;
  const result = await adminService.listUsers({
    query: query || '',
    limit: Math.min(parseInt(limit, 10) || 50, 100),
    offset: parseInt(offset, 10) || 0,
  });
  res.json(result);
}

export async function getUserById(req, res) {
  const user = await getUserIdFromRepo(req.params.id);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  res.json(user);
}

export async function activateUser(req, res) {
  const user = await adminService.activateUser(req.params.id, auditContext(req));
  res.json(user);
}

export async function deactivateUser(req, res) {
  const user = await adminService.deactivateUser(req.params.id, auditContext(req));
  res.json(user);
}

export async function grantAdmin(req, res) {
  const user = await adminService.grantAdmin(req.params.id, auditContext(req));
  res.json(user);
}

export async function revokeAdmin(req, res) {
  const user = await adminService.revokeAdmin(req.params.id, auditContext(req));
  res.json(user);
}

export async function addUserEmpresa(req, res) {
  const user = await adminService.addUserEmpresa(req.params.id, req.params.empresaId, auditContext(req));
  res.json(user);
}

export async function removeUserEmpresa(req, res) {
  const user = await adminService.removeUserEmpresa(req.params.id, req.params.empresaId, auditContext(req));
  res.json(user);
}

export async function addUserSucursal(req, res) {
  const user = await adminService.addUserSucursal(req.params.id, req.params.sucursalId, auditContext(req));
  res.json(user);
}

export async function removeUserSucursal(req, res) {
  const user = await adminService.removeUserSucursal(req.params.id, req.params.sucursalId, auditContext(req));
  res.json(user);
}

export async function listAudit(req, res) {
  const { limit, offset, action, entityType, from, to } = req.query;
  const result = await findAuditLogsList({
    limit: Math.min(parseInt(limit, 10) || 50, 100),
    offset: parseInt(offset, 10) || 0,
    action: action || undefined,
    entityType: entityType || undefined,
    from: from || undefined,
    to: to || undefined,
  });
  res.json(result);
}
