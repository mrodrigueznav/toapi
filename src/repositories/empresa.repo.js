import { Op } from 'sequelize';
import { Empresa, Sucursal } from '../models/index.js';

export async function findAllEmpresas(where = {}) {
  return Empresa.findAll({ where, order: [['nombre', 'ASC']] });
}

export async function findEmpresaById(id) {
  return Empresa.findByPk(id);
}

export async function findEmpresasByIds(ids) {
  if (!ids?.length) return [];
  return Empresa.findAll({ where: { id: { [Op.in]: ids } } });
}

export async function createEmpresa(data) {
  return Empresa.create(data);
}

export async function updateEmpresa(id, data) {
  const row = await Empresa.findByPk(id);
  if (!row) return null;
  await row.update(data);
  return row;
}

export async function findSucursalesByEmpresaId(empresaId, where = {}) {
  return Sucursal.findAll({
    where: { empresaId, ...where },
    order: [['nombre', 'ASC']],
  });
}

export async function findSucursalById(id) {
  return Sucursal.findByPk(id);
}

export async function findSucursalByIdAndEmpresa(sucursalId, empresaId) {
  return Sucursal.findOne({ where: { id: sucursalId, empresaId } });
}

export async function createSucursal(data) {
  return Sucursal.create(data);
}

export async function updateSucursal(id, data) {
  const row = await Sucursal.findByPk(id);
  if (!row) return null;
  await row.update(data);
  return row;
}
