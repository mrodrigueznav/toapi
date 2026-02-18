export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('Captura', {
    id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
    empresaId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Empresa', key: 'id' }, onDelete: 'CASCADE' },
    sucursalId: { type: Sequelize.UUID, allowNull: false, references: { model: 'Sucursal', key: 'id' }, onDelete: 'CASCADE' },
    tipoSUA: { type: Sequelize.ENUM('IMSS', 'RCV', 'INFONAVIT'), allowNull: false },
    status: { type: Sequelize.ENUM('CONFIRMED'), allowNull: false },
    data: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    fileRefs: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
    createdBy: { type: Sequelize.TEXT, allowNull: false },
    idempotencyKey: { type: Sequelize.TEXT, allowNull: true },
    createdAt: { type: Sequelize.DATE, allowNull: false },
    updatedAt: { type: Sequelize.DATE, allowNull: false },
  });
  await queryInterface.addIndex('Captura', ['empresaId', 'sucursalId', 'createdAt']);
  await queryInterface.addIndex('Captura', ['createdBy', 'createdAt']);
  await queryInterface.sequelize.query(
    'CREATE UNIQUE INDEX "captura_idempotency_unique" ON "Captura" ("createdBy", "empresaId", "sucursalId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;'
  );
}

export async function down(queryInterface) {
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "captura_idempotency_unique";');
  await queryInterface.dropTable('Captura');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Captura_status"; DROP TYPE IF EXISTS "enum_Captura_tipoSUA";');
}

