import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      nombre: 'Mario Quirós (Admin Master)',
      email: 'mquirosp78@gmail.com',
      telefono: '+50600000000',
      rol: 'ADMIN',
      plan: 'ORO'
    }
  });

  console.log('--- ADMIN USER CREATED ---');
  console.log('Username: admin');
  console.log('Password: admin123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
