import { User, UserEmpresa, UserSucursal, Empresa, Sucursal } from '../models/index.js';
import { Op } from 'sequelize';

export async function getUserByClerkUserId(clerkUserId) {
  return User.findOne({ where: { clerkUserId } });
}

export async function getUserById(id) {
  return User.findByPk(id, {
    include: [
      { model: UserEmpresa, include: [{ model: Empresa }] },
      { model: UserSucursal, include: [{ model: Sucursal }] },
    ],
  });
}

export async function findUsersList({ query, limit = 50, offset = 0 } = {}) {
  const where = {};
  if (query?.trim()) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${query.trim()}%` } },
      { clerkUserId: { [Op.iLike]: `%${query.trim()}%` } },
    ];
  }
  const { rows, count } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { model: UserEmpresa, attributes: ['empresaId'], include: [{ model: Empresa, attributes: ['id', 'nombre'] }] },
      { model: UserSucursal, attributes: ['sucursalId'], include: [{ model: Sucursal, attributes: ['id', 'nombre', 'empresaId'] }] },
    ],
  });
  return { rows, total: count };
}

export async function createUser(data) {
  return User.create(data);
}

export async function findUserByClerkOrEmail(clerkUserId, email) {
  const where = {};
  if (clerkUserId) where.clerkUserId = clerkUserId;
  if (email) where.email = email;
  if (Object.keys(where).length === 0) return null;
  if (Object.keys(where).length === 2) {
    return User.findOne({ where: { [Op.or]: [{ clerkUserId }, { email }] } });
  }
  return User.findOne({ where });
}

export async function updateUser(id, data) {
  const user = await User.findByPk(id);
  if (!user) return null;
  await user.update(data);
  return user;
}

export async function getUserEmpresas(userId) {
  const list = await UserEmpresa.findAll({
    where: { userId },
    include: [{ model: Empresa }],
  });
  return list.map(ue => ue.Empresa);
}

export async function getUserSucursales(userId) {
  const list = await UserSucursal.findAll({
    where: { userId },
    include: [{ model: Sucursal, include: [{ model: Empresa, attributes: ['id'] }] }],
  });
  return list.map(us => us.Sucursal);
}

export async function addUserEmpresa(userId, empresaId) {
  const [ue] = await UserEmpresa.findOrCreate({
    where: { userId, empresaId },
    defaults: { userId, empresaId },
  });
  return ue;
}

export async function removeUserEmpresa(userId, empresaId) {
  const deleted = await UserEmpresa.destroy({ where: { userId, empresaId } });
  return deleted > 0;
}

export async function addUserSucursal(userId, sucursalId) {
  const [us] = await UserSucursal.findOrCreate({
    where: { userId, sucursalId },
    defaults: { userId, sucursalId },
  });
  return us;
}

export async function removeUserSucursal(userId, sucursalId) {
  const deleted = await UserSucursal.destroy({ where: { userId, sucursalId } });
  return deleted > 0;
}

export async function getUserEmpresaIds(userId) {
  const list = await UserEmpresa.findAll({ where: { userId }, attributes: ['empresaId'] });
  return list.map(ue => ue.empresaId);
}

export async function getUserSucursalIdsByEmpresa(userId) {
  const list = await UserSucursal.findAll({
    where: { userId },
    include: [{ model: Sucursal, attributes: ['id', 'empresaId'] }],
  });
  const byEmpresa = {};
  for (const us of list) {
    const empId = us.Sucursal?.empresaId;
    if (empId) {
      if (!byEmpresa[empId]) byEmpresa[empId] = [];
      byEmpresa[empId].push(us.sucursalId);
    }
  }
  return byEmpresa;
}
