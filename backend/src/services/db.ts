import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// In-Memory Database fallback for offline/development running without setup
export interface MemoryUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'ADMIN' | 'PRESTAMISTA';
  createdAt: Date;
}

export interface MemorySubscription {
  id: string;
  userId: string;
  tipo: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  validUntil: Date;
  createdAt: Date;
}

export interface MemoryLoan {
  id: string;
  prestamistaId: string;
  clienteNombre: string;
  clienteTelefono: string;
  montoOriginal: number;
  totalAPagar: number;
  cuotaSemanal: number;
  diaCobro: number;
  estado: 'ACTIVE' | 'PAID';
  fechaInicio: Date;
}

export interface MemoryPayment {
  id: string;
  loanId: string;
  montoAbonado: number;
  numeroRecibo: string;
  notas?: string;
  fechaPago: Date;
}

export interface MemoryBusinessSettings {
  id: string;
  userId: string;
  monedaSimbolo: string;
  monedaCodigo: string;
  nombreNegocio: string;
  plantillaWhatsapp: string;
  gananciaPorcentaje: number;
}

class InMemoryStore {
  users: MemoryUser[] = [
    {
      id: 'mock-lender-id-123',
      nombre: 'Juan Pérez Cobranzas',
      email: 'lender@caterpillar-saas.com',
      telefono: '+525512345678',
      rol: 'PRESTAMISTA',
      createdAt: new Date()
    },
    {
      id: 'mock-admin-id-999',
      nombre: 'Administrador Caterpillar',
      email: 'admin@caterpillar-saas.com',
      telefono: '+525599999999',
      rol: 'ADMIN',
      createdAt: new Date()
    },
    {
      id: 'expiring-lender-id-1',
      nombre: 'Pedro González (Por Vencer)',
      email: 'pedro@expiring.com',
      telefono: '+525544332211',
      rol: 'PRESTAMISTA',
      createdAt: new Date()
    },
    {
      id: 'expired-lender-id-2',
      nombre: 'Sofía Martínez (Expirada)',
      email: 'sofia@expired.com',
      telefono: '+525577889900',
      rol: 'PRESTAMISTA',
      createdAt: new Date()
    }
  ];

  subscriptions: MemorySubscription[] = [
    {
      id: 'sub-1',
      userId: 'mock-lender-id-123',
      tipo: 'ACTIVE',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      createdAt: new Date()
    },
    {
      id: 'sub-2',
      userId: 'mock-admin-id-999',
      tipo: 'ACTIVE',
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdAt: new Date()
    },
    {
      id: 'sub-3',
      userId: 'expiring-lender-id-1',
      tipo: 'ACTIVE',
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now (under 5 days warning)
      createdAt: new Date()
    },
    {
      id: 'sub-4',
      userId: 'expired-lender-id-2',
      tipo: 'EXPIRED',
      validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // expired 2 days ago
      createdAt: new Date()
    }
  ];

  loans: MemoryLoan[] = [
    {
      id: 'loan-1',
      prestamistaId: 'mock-lender-id-123',
      clienteNombre: 'Carlos Slim Helú',
      clienteTelefono: '5512345678',
      montoOriginal: 10000,
      totalAPagar: 15000, // 1.5 multiplier
      cuotaSemanal: 1500,
      diaCobro: 1, // Lunes
      estado: 'ACTIVE',
      fechaInicio: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'loan-2',
      prestamistaId: 'mock-lender-id-123',
      clienteNombre: 'María Rojo Méndez',
      clienteTelefono: '5587654321',
      montoOriginal: 5000,
      totalAPagar: 7500,
      cuotaSemanal: 750,
      diaCobro: 6, // Sábado (Vence Hoy, assuming today is saturday or simulation)
      estado: 'ACTIVE',
      fechaInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'loan-3',
      prestamistaId: 'mock-lender-id-123',
      clienteNombre: 'Héctor Herrera',
      clienteTelefono: '5599887766',
      montoOriginal: 20000,
      totalAPagar: 30000,
      cuotaSemanal: 3000,
      diaCobro: 2, // Martes (Atrasado)
      estado: 'ACTIVE',
      fechaInicio: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
    }
  ];

  payments: MemoryPayment[] = [
    {
      id: 'pay-1',
      loanId: 'loan-1',
      montoAbonado: 3000,
      numeroRecibo: 'REC-10001',
      notas: 'Pago de dos cuotas juntas',
      fechaPago: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    },
    {
      id: 'pay-2',
      loanId: 'loan-3',
      montoAbonado: 6000,
      numeroRecibo: 'REC-10002',
      notas: 'Abono inicial',
      fechaPago: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
    }
  ];

  settings: MemoryBusinessSettings[] = [
    {
      id: 'sett-1',
      userId: 'mock-lender-id-123',
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'CAT-LOAN Credit',
      plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
      gananciaPorcentaje: 50
    },
    {
      id: 'sett-2',
      userId: 'expired-lender-id-2',
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'Sofía Créditos',
      plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
      gananciaPorcentaje: 50
    }
  ];
}

export const inMemoryStore = new InMemoryStore();

// Flag to check if we should default to memory store
let useMemoryStore = false;

export async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL successfully.');
    useMemoryStore = false;

    // Seed data on the live Postgres DB if empty
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('PostgreSQL database is empty. Seeding initial test data...');
      
      const u1 = await prisma.user.create({
        data: {
          id: 'mock-lender-id-123',
          nombre: 'Juan Pérez Cobranzas',
          email: 'lender@caterpillar-saas.com',
          telefono: '+525512345678',
          rol: 'PRESTAMISTA'
        }
      });

      const u2 = await prisma.user.create({
        data: {
          id: 'mock-admin-id-999',
          nombre: 'Administrador Caterpillar',
          email: 'admin@caterpillar-saas.com',
          telefono: '+525599999999',
          rol: 'ADMIN'
        }
      });

      const u3 = await prisma.user.create({
        data: {
          id: 'expiring-lender-id-1',
          nombre: 'Pedro González (Por Vencer)',
          email: 'pedro@expiring.com',
          telefono: '+525544332211',
          rol: 'PRESTAMISTA'
        }
      });

      const u4 = await prisma.user.create({
        data: {
          id: 'expired-lender-id-2',
          nombre: 'Sofía Martínez (Expirada)',
          email: 'sofia@expired.com',
          telefono: '+525577889900',
          rol: 'PRESTAMISTA'
        }
      });

      // Business Settings for users
      await prisma.businessSettings.createMany({
        data: [
          {
            userId: u1.id,
            monedaSimbolo: '₡',
            monedaCodigo: 'CRC',
            nombreNegocio: 'CAT-LOAN Credit',
            gananciaPorcentaje: 50
          },
          {
            userId: u2.id,
            monedaSimbolo: '₡',
            monedaCodigo: 'CRC',
            nombreNegocio: 'CAT-LOAN Credit',
            gananciaPorcentaje: 50
          },
          {
            userId: u3.id,
            monedaSimbolo: '₡',
            monedaCodigo: 'CRC',
            nombreNegocio: 'Pedro Créditos',
            gananciaPorcentaje: 50
          },
          {
            userId: u4.id,
            monedaSimbolo: '₡',
            monedaCodigo: 'CRC',
            nombreNegocio: 'Sofía Créditos',
            gananciaPorcentaje: 50
          }
        ]
      });

      // Subscriptions
      await prisma.subscription.createMany({
        data: [
          {
            userId: u1.id,
            tipo: 'ACTIVE',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          {
            userId: u2.id,
            tipo: 'ACTIVE',
            validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          },
          {
            userId: u3.id,
            tipo: 'ACTIVE',
            validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          },
          {
            userId: u4.id,
            tipo: 'EXPIRED',
            validUntil: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          }
        ]
      });

      // Loans
      const l1 = await prisma.loan.create({
        data: {
          id: 'loan-1',
          prestamistaId: u1.id,
          clienteNombre: 'Carlos Slim Helú',
          clienteTelefono: '5512345678',
          montoOriginal: 10000,
          totalAPagar: 15000,
          cuotaSemanal: 1500,
          diaCobro: 1,
          estado: 'ACTIVE',
          fechaInicio: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      });

      const l2 = await prisma.loan.create({
        data: {
          id: 'loan-2',
          prestamistaId: u1.id,
          clienteNombre: 'María Rojo Méndez',
          clienteTelefono: '5587654321',
          montoOriginal: 5000,
          totalAPagar: 7500,
          cuotaSemanal: 750,
          diaCobro: 6,
          estado: 'ACTIVE',
          fechaInicio: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        }
      });

      const l3 = await prisma.loan.create({
        data: {
          id: 'loan-3',
          prestamistaId: u1.id,
          clienteNombre: 'Héctor Herrera',
          clienteTelefono: '5599887766',
          montoOriginal: 20000,
          totalAPagar: 30000,
          cuotaSemanal: 3000,
          diaCobro: 2,
          estado: 'ACTIVE',
          fechaInicio: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        }
      });

      // Payments
      await prisma.payment.createMany({
        data: [
          {
            loanId: l1.id,
            montoAbonado: 3000,
            numeroRecibo: 'REC-10001',
            notas: 'Pago de dos cuotas juntas',
            fechaPago: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          {
            loanId: l3.id,
            montoAbonado: 6000,
            numeroRecibo: 'REC-10002',
            notas: 'Abono inicial',
            fechaPago: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
          }
        ]
      });

      console.log('Seeding completed successfully.');
    }
  } catch (error: any) {
    console.warn('PostgreSQL database not available or schema not applied. Running in memory fallback mode.', error.message);
    useMemoryStore = true;
  }
}

export function isUsingMemoryStore() {
  return useMemoryStore;
}
