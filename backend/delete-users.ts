import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Borrando prestamistas de la base de datos Neon...');
  const result = await prisma.user.deleteMany({
    where: {
      rol: 'PRESTAMISTA'
    }
  });
  console.log(`Operación exitosa: Se eliminaron ${result.count} prestamistas.`);
}

main()
  .catch(e => {
    console.error('Error durante la eliminación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
