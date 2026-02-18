import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/sequelize.js';

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  actorUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'User', key: 'id' },
    onDelete: 'SET NULL',
  },
  actorClerkUserId: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  entityType: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  empresaId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  sucursalId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  requestId: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  ip: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'AuditLog',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false,
  indexes: [{ fields: ['action', 'createdAt'] }],
});

export default AuditLog;
