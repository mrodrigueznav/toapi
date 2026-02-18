import { AuditLog } from '../models/index.js';
import { Op } from 'sequelize';

export async function createAuditLog(data) {
  return AuditLog.create(data);
}

export async function findAuditLogsList({ action, entityType, from, to, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);
  }
  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });
  return { rows, total: count };
}
