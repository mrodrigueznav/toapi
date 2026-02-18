import { getUserEmpresaIds, getUserSucursalIdsByEmpresa } from '../repositories/user.repo.js';
import { findEmpresasByIds } from '../repositories/empresa.repo.js';

export async function me(req, res) {
  const user = req.user;
  const empresaIds = user.isAdmin ? null : await getUserEmpresaIds(user.id);
  let empresas = [];
  let sucursalesByEmpresa = {};

  if (user.isAdmin) {
    const { Empresa } = await import('../models/index.js');
    const all = await Empresa.findAll({ where: { isActive: true }, attributes: ['id', 'nombre'], order: [['nombre', 'ASC']] });
    empresas = all.map(e => ({ id: e.id, nombre: e.nombre }));
    const { Sucursal } = await import('../models/index.js');
    const allSuc = await Sucursal.findAll({ where: { isActive: true }, attributes: ['id', 'nombre', 'empresaId'] });
    for (const s of allSuc) {
      if (!sucursalesByEmpresa[s.empresaId]) sucursalesByEmpresa[s.empresaId] = [];
      sucursalesByEmpresa[s.empresaId].push(s.id);
    }
  } else if (empresaIds?.length) {
    const list = await findEmpresasByIds(empresaIds);
    empresas = list.filter(e => e.isActive).map(e => ({ id: e.id, nombre: e.nombre }));
    const sucByEmp = await getUserSucursalIdsByEmpresa(user.id);
    const { findSucursalesByEmpresaId } = await import('../repositories/empresa.repo.js');
    for (const empId of empresaIds) {
      const assigned = sucByEmp[empId];
      if (assigned === undefined || (Array.isArray(assigned) && assigned.length === 0)) {
        sucursalesByEmpresa[empId] = null;
      } else {
        sucursalesByEmpresa[empId] = assigned;
      }
    }
  }

  res.json({
    clerkUserId: user.clerkUserId,
    email: user.email,
    isAdmin: user.isAdmin,
    empresas,
    sucursalesByEmpresa,
  });
}
