import { prisma } from '../src/services/db';

async function main() {
  console.log('Iniciando migración de clientes...');

  // 1. Obtener todos los préstamos que aún no tienen clientId asignado
  const loans = await prisma.loan.findMany({
    where: { clientId: null }
  });

  console.log(`Se encontraron ${loans.length} préstamos sin cliente asignado.`);

  let createdClients = 0;
  let updatedLoans = 0;

  for (const loan of loans) {
    if (!loan.clienteNombre) {
      console.log(`Préstamo ${loan.id} saltado: clienteNombre vacío.`);
      continue;
    }

    // Buscar si ya creamos este cliente para este prestamista usando nombre + telefono
    // Para simplificar, buscamos por prestamistaId y nombre
    let client = await prisma.client.findFirst({
      where: {
        prestamistaId: loan.prestamistaId,
        nombre: loan.clienteNombre
      }
    });

    if (!client) {
      // Crear nuevo cliente
      client = await prisma.client.create({
        data: {
          prestamistaId: loan.prestamistaId,
          nombre: loan.clienteNombre,
          telefono: loan.clienteTelefono || '00000000',
          tipoIdentificacion: loan.tipoIdentificacion,
          numeroIdentificacion: loan.numeroIdentificacion || null,
        }
      });
      createdClients++;
    }

    // Asignar el clientId al préstamo
    await prisma.loan.update({
      where: { id: loan.id },
      data: { clientId: client.id }
    });
    updatedLoans++;
  }

  console.log(`Migración completada.`);
  console.log(`- Clientes nuevos creados: ${createdClients}`);
  console.log(`- Préstamos actualizados: ${updatedLoans}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
