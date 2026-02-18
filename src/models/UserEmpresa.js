import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/sequelize.js';

const UserEmpresa = sequelize.define('UserEmpresa', {
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
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Empresa', key: 'id' },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'UserEmpresa',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [{ unique: true, fields: ['userId', 'empresaId'] }],
});

export default UserEmpresa;
