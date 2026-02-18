import { Op } from 'sequelize';
import { Captura } from '../models/index.js';

const TIPOS_SUA = ['IMSS', 'RCV', 'INFONAVIT'];

export function getTiposSUA() {
  return TIPOS_SUA;
}

export async function createCaptura(data) {
  return Captura.create(data);
}

export async function findCapturaById(id) {
  return Captura.findByPk(id);
}

export async function findByIdempotencyKey(createdBy, empresaId, sucursalId, idempotencyKey) {
  if (!idempotencyKey) return null;
  return Captura.findOne({
    where: { createdBy, empresaId, sucursalId, idempotencyKey },
  });
}

export async function findCapturasList({
  empresaId,
  sucursalId,
  tipoSUA,
  fromDate,
  toDate,
  createdBy,
  limit = 50,
  offset = 0,
  accessibleEmpresaIds = null,
  accessibleSucursalIds = null,
  isAdmin = false,
}) {
  const where = {};
  if (empresaId) where.empresaId = empresaId;
  if (sucursalId) where.sucursalId = sucursalId;
  if (tipoSUA && TIPOS_SUA.includes(tipoSUA)) where.tipoSUA = tipoSUA;
  if (createdBy) where.createdBy = createdBy;
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt[Op.gte] = new Date(fromDate);
    if (toDate) where.createdAt[Op.lte] = new Date(toDate);
  }
  if (!isAdmin && accessibleEmpresaIds?.length && accessibleSucursalIds?.length) {
    where.empresaId = { [Op.in]: accessibleEmpresaIds };
    where.sucursalId = { [Op.in]: accessibleSucursalIds };
  }
  const { rows, count } = await Captura.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  return { rows, total: count };
}
