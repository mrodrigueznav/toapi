export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Sucursal', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    empresaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Empresa', key: 'id' }, onDelete: 'CASCADE' },
    nombre: { type: Sequelize.TEXT, allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('Sucursal', ['empresaId']);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('Sucursal');
}
