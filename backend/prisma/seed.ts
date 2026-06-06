import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const validUntil = new Date('2050-12-31T23:59:59.000Z');

  // List of accounts to seed
  const accounts = [
    {
      nombre: 'Mario Quirós (Admin)',
      email: 'mario.quiros.admin@gmail.com',
      rol: 'ADMIN' as const
    },
    {
      nombre: 'Mario Quirós (Admin Placeholder)',
      email: 'TU_CORREO_ADMIN@gmail.com',
      rol: 'ADMIN' as const
    },
    {
      nombre: 'Mario Quirós (Prestamista)',
      email: 'mario.quiros.prestamista@gmail.com',
      rol: 'PRESTAMISTA' as const
    },
    {
      nombre: 'Mario Quirós (Prestamista Placeholder)',
      email: 'TU_CORREO_PRUEBAS@gmail.com',
      rol: 'PRESTAMISTA' as const
    }
  ];

  for (const acc of accounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        nombre: acc.nombre,
        rol: acc.rol
      },
      create: {
        nombre: acc.nombre,
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
