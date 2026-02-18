/**
 * Init models and associations. Must run after sequelize is ready.
 */
import Empresa from './Empresa.js';
import Sucursal from './Sucursal.js';
import User from './User.js';
import UserEmpresa from './UserEmpresa.js';
import UserSucursal from './UserSucursal.js';
import Captura from './Captura.js';
import AuditLog from './AuditLog.js';

// Associations
Empresa.hasMany(Sucursal, { foreignKey: 'empresaId' });
Sucursal.belongsTo(Empresa, { foreignKey: 'empresaId' });

User.belongsToMany(Empresa, { through: UserEmpresa, foreignKey: 'userId', otherKey: 'empresaId' });
Empresa.belongsToMany(User, { through: UserEmpresa, foreignKey: 'empresaId', otherKey: 'userId' });

User.belongsToMany(Sucursal, { through: UserSucursal, foreignKey: 'userId', otherKey: 'sucursalId' });
Sucursal.belongsToMany(User, { through: UserSucursal, foreignKey: 'sucursalId', otherKey: 'userId' });

User.hasMany(UserEmpresa, { foreignKey: 'userId' });
UserEmpresa.belongsTo(User, { foreignKey: 'userId' });
Empresa.hasMany(UserEmpresa, { foreignKey: 'empresaId' });
UserEmpresa.belongsTo(Empresa, { foreignKey: 'empresaId' });

User.hasMany(UserSucursal, { foreignKey: 'userId' });
UserSucursal.belongsTo(User, { foreignKey: 'userId' });
Sucursal.hasMany(UserSucursal, { foreignKey: 'sucursalId' });
UserSucursal.belongsTo(Sucursal, { foreignKey: 'sucursalId' });

Empresa.hasMany(Captura, { foreignKey: 'empresaId' });
Captura.belongsTo(Empresa, { foreignKey: 'empresaId' });
Sucursal.hasMany(Captura, { foreignKey: 'sucursalId' });
Captura.belongsTo(Sucursal, { foreignKey: 'sucursalId' });

AuditLog.belongsTo(User, { foreignKey: 'actorUserId' });

export {
  Empresa,
  Sucursal,
  User,
  UserEmpresa,
  UserSucursal,
  Captura,
  AuditLog,
};

export default {
  Empresa,
  Sucursal,
  User,
  UserEmpresa,
  UserSucursal,
  Captura,
  AuditLog,
};
