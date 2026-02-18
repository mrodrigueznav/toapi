export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('User', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    clerkUserId: { type: Sequelize.TEXT, allowNull: false },
    email: { type: Sequelize.TEXT, allowNull: true },
    isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    isAdmin: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('User', ['clerkUserId'], { unique: true });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('User');
}
