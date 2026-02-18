import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../config/sequelize.js';

const Captura = sequelize.define('Captura', {
  id: {
    type: DataTypes.UUID,
    defaultValue: () => uuidv4(),
    primaryKey: true,
  },
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Empresa', key: 'id' },
    onDelete: 'CASCADE',
  },
  sucursalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'Sucursal', key: 'id' },
    onDelete: 'CASCADE',
  },
  tipoSUA: {
    type: DataTypes.ENUM('IMSS', 'RCV', 'INFONAVIT'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('CONFIRMED'),
    allowNull: false,
    defaultValue: 'CONFIRMED',
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  fileRefs: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  createdBy: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  idempotencyKey: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'Captura',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    { fields: ['empresaId', 'sucursalId', 'createdAt'] },
    { fields: ['createdBy', 'createdAt'] },
    { name: 'captura_idempotency_unique', unique: true, fields: ['createdBy', 'empresaId', 'sucursalId', 'idempotencyKey'] },
  ],
});

export default Captura;
