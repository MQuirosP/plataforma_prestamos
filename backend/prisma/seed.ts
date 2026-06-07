import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const validUntil = new Date('2050-12-31T23:59:59.000Z');

  const accounts = [
    {
      nombre: 'Mario Quirós (Admin)',
      email: 'mario.quiros.admin@gmail.com',
      rol: 'ADMIN' as const
    }
  ];

  for (const acc of accounts) {
    const username = acc.email.split('@')[0];
    const user = await prisma.user.upsert({
      where: { username },
      update: {
        nombre: acc.nombre,
        rol: acc.rol
      },
      create: {
        nombre: acc.nombre,
        username: username,
        password: '$2a$10$tZ2E2Ea5SjY3P0U.Z1Fw1e0yH2gR7kG3yO2N3mZ.tM7M1lM3mP9J.', // hash for "123456"
        email: acc.email,
        telefono: '+50688888888',
        rol: acc.rol
      }
    });

    console.log(`👤 User upserted: ${user.nombre} (${user.email})`);

    // Create active subscription
    await prisma.subscription.deleteMany({
      where: { userId: user.id }
    });

    await prisma.subscription.create({
      data: {
        userId: user.id,
        tipo: 'ACTIVE',
        validUntil
      }
    });

    // Create Business settings
    await prisma.businessSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: acc.rol === 'ADMIN' ? 'CAT-LOAN Admin Corp' : 'Cobros Mario Q.',
        gananciaPorcentaje: 50
      }
    });
  }

  console.log('⚙️ Default Business Settings initialized for all seed users.');

  // Seed SaaS Plan Configurations
  const planConfigs = [
    { plan: 'BRONCE' as const, maxClientes: 10, maxCobradores: 0, precioMensual: 5000 },
    { plan: 'PLATA' as const, maxClientes: 20, maxCobradores: 1, precioMensual: 7500 },
    { plan: 'ORO' as const, maxClientes: 35, maxCobradores: 2, precioMensual: 10000 },
    { plan: 'PLATINO' as const, maxClientes: 50, maxCobradores: 5, precioMensual: 20000 },
    { plan: 'DIAMANTE' as const, maxClientes: -1, maxCobradores: -1, precioMensual: 30000 }
  ];

  for (const p of planConfigs) {
    await prisma.saaSPlanConfig.upsert({
      where: { plan: p.plan },
      update: { maxClientes: p.maxClientes, maxCobradores: p.maxCobradores, precioMensual: p.precioMensual },
      create: p
    });
  }
  console.log('⚙️ Default SaaS Plan Configs initialized.');

  console.log('✅ Seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding error occurred:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
