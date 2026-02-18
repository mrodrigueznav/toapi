export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('UserSucursal', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    userId: { type: Sequelize.UUID, allowNull: false, references: { model: 'User', key: 'id' }, onDelete: 'CASCADE' },
    sucursalId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Sucursal', key: 'id' }, onDelete: 'CASCADE' },
    createdAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('UserSucursal', ['userId', 'sucursalId'], { unique: true });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('UserSucursal');
}
