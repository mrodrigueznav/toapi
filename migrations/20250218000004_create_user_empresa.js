export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserEmpresa', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
    empresaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Empresa', key: 'id' }, onDelete: 'CASCADE' },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('UserEmpresa', ['userId', 'empresaId'], { unique: true });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('UserEmpresa');
}
