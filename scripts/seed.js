/**
 * Seed script (ESM). Seeds initial admin user, sample empresas/sucursales, assignments.
 * Run from project root: node scripts/seed.js
 */
import '../src/config/env.js';
import { sequelize } from '../src/config/sequelize.js';
import '../src/models/index.js';
import { User, Empresa, Sucursal, UserEmpresa, UserSucursal } from '../src/models/index.js';
import env from '../src/config/env.js';

async function seed() {
  await sequelize.authenticate();

  const adminClerkId = env.CLERK_ADMIN_USER_ID || 'admin-clerk-placeholder';
  const adminEmail = env.CLERK_ADMIN_EMAIL || 'admin@tohuanti.local';

  let admin = await User.findOne({ where: { clerkUserId: adminClerkId } });
  if (!admin) {
    admin = await User.create({
      clerkUserId: adminClerkId,
      email: adminEmail,
      isActive: true,
      isAdmin: true,
    });
    console.log('Created admin user:', admin.id);
  } else {
    await admin.update({ isAdmin: true, isActive: true });
    console.log('Updated existing admin user');
  }

  let emp1 = await Empresa.findOne({ where: { nombre: 'Empresa Demo' } });
  if (!emp1) {
    emp1 = await Empresa.create({ nombre: 'Empresa Demo', isActive: true });
    console.log('Created Empresa Demo:', emp1.id);
  }
  let emp2 = await Empresa.findOne({ where: { nombre: 'Empresa Sample' } });
  if (!emp2) {
    emp2 = await Empresa.create({ nombre: 'Empresa Sample', isActive: true });
    console.log('Created Empresa Sample:', emp2.id);
  }

  let suc1 = await Sucursal.findOne({ where: { empresaId: emp1.id, nombre: 'Sucursal Centro' } });
  if (!suc1) {
    suc1 = await Sucursal.create({ empresaId: emp1.id, nombre: 'Sucursal Centro', isActive: true });
    console.log('Created Sucursal Centro:', suc1.id);
  }
  let suc2 = await Sucursal.findOne({ where: { empresaId: emp1.id, nombre: 'Sucursal Norte' } });
  if (!suc2) {
    suc2 = await Sucursal.create({ empresaId: emp1.id, nombre: 'Sucursal Norte', isActive: true });
    console.log('Created Sucursal Norte:', suc2.id);
  }
  let suc3 = await Sucursal.findOne({ where: { empresaId: emp2.id, nombre: 'Sucursal Principal' } });
  if (!suc3) {
    suc3 = await Sucursal.create({ empresaId: emp2.id, nombre: 'Sucursal Principal', isActive: true });
    console.log('Created Sucursal Principal:', suc3.id);
  }

  for (const emp of [emp1, emp2]) {
    const [ue] = await UserEmpresa.findOrCreate({
      where: { userId: admin.id, empresaId: emp.id },
      defaults: { userId: admin.id, empresaId: emp.id },
    });
    if (ue) console.log('Admin assigned to empresa', emp.nombre);
  }

  for (const suc of [suc1, suc2, suc3]) {
    const [us] = await UserSucursal.findOrCreate({
      where: { userId: admin.id, sucursalId: suc.id },
      defaults: { userId: admin.id, sucursalId: suc.id },
    });
    if (us) console.log('Admin assigned to sucursal', suc.nombre);
  }

  console.log('Seed complete.');
  await sequelize.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
