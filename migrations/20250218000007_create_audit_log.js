export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('AuditLog', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    actorUserId: { type: Sequelize.UUID, allowNull: true, references: { model: 'User', key: 'id' }, onDelete: 'SET NULL' },
    actorClerkUserId: { type: Sequelize.TEXT, allowNull: true },
    action: { type: Sequelize.TEXT, allowNull: false },
    entityType: { type: Sequelize.TEXT, allowNull: false },
    entityId: { type: Sequelize.UUID, allowNull: true },
    empresaId: { type: Sequelize.UUID, allowNull: true },
    sucursalId: { type: Sequelize.UUID, allowNull: true },
    metadata: { type: Sequelize.JSONB, allowNull: true, defaultValue: {} },
    requestId: { type: Sequelize.TEXT, allowNull: true },
    ip: { type: Sequelize.TEXT, allowNull: true },
    userAgent: { type: Sequelize.TEXT, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('AuditLog', ['action', 'createdAt']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('AuditLog');
}
