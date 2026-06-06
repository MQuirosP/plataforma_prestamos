import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create or update Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'mario@caterpillar-saas.com' },
    update: {
      nombre: 'Mario Quirós Pizarro',
      telefono: '+50688888888',
      rol: 'ADMIN'
    },
    create: {
      nombre: 'Mario Quirós Pizarro',
      email: 'mario@caterpillar-saas.com',
      telefono: '+50688888888',
      rol: 'ADMIN'
    }
  });

  console.log(`👤 Admin user upserted: ${admin.nombre}`);

  // Create active subscription expiring in 2050
  const validUntil = new Date('2050-12-31T23:59:59.000Z');
  
  // Clean past subscriptions for this admin to prevent duplicates
  await prisma.subscription.deleteMany({
    where: { userId: admin.id }
  });

  await prisma.subscription.create({
    data: {
      userId: admin.id,
      tipo: 'ACTIVE',
      validUntil
    }
  });

  console.log(`💳 Active subscription created, valid until 2050`);

  // Create default business settings
  await prisma.businessSettings.upsert({
    where: { userId: admin.id },
    update: {
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'CAT-LOAN Credit',
      gananciaPorcentaje: 50
    },
    create: {
      userId: admin.id,
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'CAT-LOAN Credit',
      gananciaPorcentaje: 50
    }
  });

  console.log(`⚙️ Default Business Settings initialized for CR`);
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
