export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Empresa', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    nombre: { type: Sequelize.TEXT, allowNull: false },
    isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('Empresa');
}
