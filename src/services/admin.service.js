/**
 * Admin operations: users, empresas, sucursales.
 */
import { ApiError, ErrorCodes } from '../utils/errors.js';
import * as empresaRepo from '../repositories/empresa.repo.js';
import * as userRepo from '../repositories/user.repo.js';
import { logAudit } from './audit.service.js';
import { normalizeEmail } from '../utils/sanitize.js';

export async function createEmpresa(data, auditContext) {
  const empresa = await empresaRepo.createEmpresa({ nombre: data.nombre, isActive: true });
  await logAudit({
    ...auditContext,
    action: 'EMPRESA_CREATE',
    entityType: 'Empresa',
    entityId: empresa.id,
    metadata: { nombre: empresa.nombre },
  });
  return empresa;
}

export async function updateEmpresa(id, data, auditContext) {
  const empresa = await empresaRepo.findEmpresaById(id);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  await empresa.update(data);
  await logAudit({
    ...auditContext,
    action: 'EMPRESA_UPDATE',
    entityType: 'Empresa',
    entityId: id,
    empresaId: id,
    metadata: data,
  });
  return empresa;
}

export async function activateEmpresa(id, auditContext) {
  const empresa = await empresaRepo.findEmpresaById(id);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  await empresa.update({ isActive: true });
  await logAudit({ ...auditContext, action: 'EMPRESA_ACTIVATE', entityType: 'Empresa', entityId: id, empresaId: id });
  return empresa;
}

export async function deactivateEmpresa(id, auditContext) {
  const empresa = await empresaRepo.findEmpresaById(id);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  await empresa.update({ isActive: false });
  await logAudit({ ...auditContext, action: 'EMPRESA_DEACTIVATE', entityType: 'Empresa', entityId: id, empresaId: id });
  return empresa;
}

export async function createSucursal(empresaId, data, auditContext) {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  const sucursal = await empresaRepo.createSucursal({
    empresaId,
    nombre: data.nombre,
    isActive: true,
  });
  await logAudit({
    ...auditContext,
    action: 'SUCURSAL_CREATE',
    entityType: 'Sucursal',
    entityId: sucursal.id,
    empresaId,
    metadata: { nombre: sucursal.nombre },
  });
  return sucursal;
}

export async function updateSucursal(id, data, auditContext) {
  const sucursal = await empresaRepo.findSucursalById(id);
  if (!sucursal) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Sucursal not found');
  await sucursal.update(data);
  await logAudit({
    ...auditContext,
    action: 'SUCURSAL_UPDATE',
    entityType: 'Sucursal',
    entityId: id,
    empresaId: sucursal.empresaId,
    sucursalId: id,
    metadata: data,
  });
  return sucursal;
}

export async function activateSucursal(id, auditContext) {
  const sucursal = await empresaRepo.findSucursalById(id);
  if (!sucursal) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Sucursal not found');
  await sucursal.update({ isActive: true });
  await logAudit({
    ...auditContext,
    action: 'SUCURSAL_ACTIVATE',
    entityType: 'Sucursal',
    entityId: id,
    empresaId: sucursal.empresaId,
    sucursalId: id,
  });
  return sucursal;
}

export async function deactivateSucursal(id, auditContext) {
  const sucursal = await empresaRepo.findSucursalById(id);
  if (!sucursal) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Sucursal not found');
  await sucursal.update({ isActive: false });
  await logAudit({
    ...auditContext,
    action: 'SUCURSAL_DEACTIVATE',
    entityType: 'Sucursal',
    entityId: id,
    empresaId: sucursal.empresaId,
    sucursalId: id,
  });
  return sucursal;
}

export async function createUser(data, auditContext) {
  const email = data.email ? normalizeEmail(data.email) : null;
  const existing = await userRepo.findUserByClerkOrEmail(data.clerkUserId, email);
  if (existing) return existing;
  const user = await userRepo.createUser({
    clerkUserId: data.clerkUserId,
    email: email || null,
    isAdmin: data.isAdmin === true,
    isActive: true,
  });
  await logAudit({
    ...auditContext,
    action: 'USER_CREATE',
    entityType: 'User',
    entityId: user.id,
    metadata: { clerkUserId: user.clerkUserId, email: user.email },
  });
  return user;
}

export async function listUsers(opts) {
  return userRepo.findUsersList(opts);
}

export async function activateUser(id, auditContext) {
  const user = await userRepo.getUserById(id);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  await user.update({ isActive: true });
  await logAudit({
    ...auditContext,
    action: 'USER_ACTIVATE',
    entityType: 'User',
    entityId: id,
    metadata: {},
  });
  return user;
}

export async function deactivateUser(id, auditContext) {
  const user = await userRepo.getUserById(id);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  await user.update({ isActive: false });
  await logAudit({
    ...auditContext,
    action: 'USER_DEACTIVATE',
    entityType: 'User',
    entityId: id,
    metadata: {},
  });
  return user;
}

export async function grantAdmin(id, auditContext) {
  const user = await userRepo.getUserById(id);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  await user.update({ isAdmin: true });
  await logAudit({
    ...auditContext,
    action: 'USER_GRANT_ADMIN',
    entityType: 'User',
    entityId: id,
    metadata: {},
  });
  return user;
}

export async function revokeAdmin(id, auditContext) {
  const user = await userRepo.getUserById(id);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  await user.update({ isAdmin: false });
  await logAudit({
    ...auditContext,
    action: 'USER_REVOKE_ADMIN',
    entityType: 'User',
    entityId: id,
    metadata: {},
  });
  return user;
}

export async function addUserEmpresa(userId, empresaId, auditContext) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Empresa not found');
  await userRepo.addUserEmpresa(userId, empresaId);
  await logAudit({
    ...auditContext,
    action: 'USER_EMPRESA_ADD',
    entityType: 'User',
    entityId: userId,
    empresaId,
    metadata: {},
  });
  return userRepo.getUserById(userId);
}

export async function removeUserEmpresa(userId, empresaId, auditContext) {
  const removed = await userRepo.removeUserEmpresa(userId, empresaId);
  if (!removed) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Assignment not found');
  await logAudit({
    ...auditContext,
    action: 'USER_EMPRESA_REMOVE',
    entityType: 'User',
    entityId: userId,
    empresaId,
    metadata: {},
  });
  return userRepo.getUserById(userId);
}

export async function addUserSucursal(userId, sucursalId, auditContext) {
  const user = await userRepo.getUserById(userId);
  if (!user) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'User not found');
  const sucursal = await empresaRepo.findSucursalById(sucursalId);
  if (!sucursal) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Sucursal not found');
  await userRepo.addUserSucursal(userId, sucursalId);
  await logAudit({
    ...auditContext,
    action: 'USER_SUCURSAL_ADD',
    entityType: 'User',
    entityId: userId,
    sucursalId,
    empresaId: sucursal.empresaId,
    metadata: {},
  });
  return userRepo.getUserById(userId);
}

export async function removeUserSucursal(userId, sucursalId, auditContext) {
  const removed = await userRepo.removeUserSucursal(userId, sucursalId);
  if (!removed) throw new ApiError(404, ErrorCodes.NOT_FOUND, 'Assignment not found');
  await logAudit({
    ...auditContext,
    action: 'USER_SUCURSAL_REMOVE',
    entityType: 'User',
    entityId: userId,
    sucursalId,
    metadata: {},
  });
  return userRepo.getUserById(userId);
}

export default {
  createEmpresa,
  updateEmpresa,
  activateEmpresa,
  deactivateEmpresa,
  createSucursal,
  updateSucursal,
  activateSucursal,
  deactivateSucursal,
  createUser,
  listUsers,
  activateUser,
  deactivateUser,
  grantAdmin,
  revokeAdmin,
  addUserEmpresa,
  removeUserEmpresa,
  addUserSucursal,
  removeUserSucursal,
};
