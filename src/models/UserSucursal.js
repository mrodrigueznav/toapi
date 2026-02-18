import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/sequelize.js';

const UserSucursal = sequelize.define('UserSucursal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'User', key: 'id' },
    onDelete: 'CASCADE',
  },
  sucursalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Sucursal', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'UserSucursal',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [{ unique: true, fields: ['userId', 'sucursalId'] }],
});

export default UserSucursal;
