import { findAllEmpresas, findSucursalesByEmpresaId } from '../repositories/empresa.repo.js';
import { getAccessibleEmpresaIds } from '../services/access.service.js';

export async function getEmpresas(req, res) {
  const user = req.user;
  const all = await findAllEmpresas({ isActive: true });
  if (user.isAdmin) {
    return res.json(all.map(e => ({ id: e.id, nombre: e.nombre, isActive: e.isActive })));
  }
  const allowedIds = await getAccessibleEmpresaIds(user, all.map(e => e.id));
  const filtered = all.filter(e => allowedIds.includes(e.id));
  res.json(filtered.map(e => ({ id: e.id, nombre: e.nombre, isActive: e.isActive })));
}

export async function getSucursales(req, res) {
  const { empresaId } = req.params;
  const user = req.user;
  const sucursales = await findSucursalesByEmpresaId(empresaId, { isActive: true });
  if (user.isAdmin) {
    return res.json(sucursales.map(s => ({ id: s.id, nombre: s.nombre, empresaId: s.empresaId, isActive: s.isActive })));
  }
  const { checkTenantAccess } = await import('../services/access.service.js');
  const { getUserEmpresaIds, getUserSucursalIdsByEmpresa } = await import('../repositories/user.repo.js');
  const userEmpresaIds = await getUserEmpresaIds(user.id);
  if (!userEmpresaIds.includes(empresaId)) {
    return res.status(403).json({ error: 'No access to this empresa' });
  }
  const sucByEmp = await getUserSucursalIdsByEmpresa(user.id);
  const assigned = sucByEmp[empresaId];
  if (assigned === undefined || (Array.isArray(assigned) && assigned.length === 0)) {
    return res.json(sucursales.map(s => ({ id: s.id, nombre: s.nombre, empresaId: s.empresaId, isActive: s.isActive })));
  }
  const allowed = sucursales.filter(s => assigned.includes(s.id));
  res.json(allowed.map(s => ({ id: s.id, nombre: s.nombre, empresaId: s.empresaId, isActive: s.isActive })));
}
