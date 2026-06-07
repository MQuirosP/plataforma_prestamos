import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// In-Memory Database fallback for offline/development running without setup
export interface MemoryUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'ADMIN' | 'PRESTAMISTA' | 'COBRADOR';
  prestamistaId?: string; // Solo para COBRADOR
  plan?: string;
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
  metodoPago: 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA';
  creadoPorId?: string;
  fechaPago: Date;
}

export interface MemoryCajaCobrador {
  id: string;
  cobradorId: string;
  saldoEfectivo: number;
  saldoSinpe: number;
  saldoTransferencia: number;
}

export interface MemoryLiquidacion {
  id: string;
  prestamistaId: string;
  cobradorId: string;
  montoEfectivo: number;
  montoSinpe: number;
  montoTransferencia: number;
  montoTotal: number;
  estado: 'PENDING' | 'LIQUIDATED';
  notas?: string | null;
  fecha: Date;
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
      id: 'mock-admin-id-999',
      nombre: 'Mario Quirós (Admin)',
      email: 'mario.quiros.admin@gmail.com',
      telefono: '+50688888888',
      rol: 'ADMIN',
      createdAt: new Date()
    }
  ];
  cajas: MemoryCajaCobrador[] = [];
  liquidaciones: MemoryLiquidacion[] = [];

  subscriptions: MemorySubscription[] = [
    {
      id: 'sub-2',
      userId: 'mock-admin-id-999',
      tipo: 'ACTIVE',
      validUntil: new Date('2050-12-31T23:59:59.000Z'),
      createdAt: new Date()
    }
  ];

  loans: MemoryLoan[] = [];
  payments: MemoryPayment[] = [];

  settings: MemoryBusinessSettings[] = [
    {
      id: 'sett-2',
      userId: 'mock-admin-id-999',
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'CAT-LOAN Admin',
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
      
      const u2 = await prisma.user.create({
        data: {
          id: 'mock-admin-id-999',
          nombre: 'Mario Quirós (Admin)',
          username: 'admin',
          password: '$2a$10$tZ2E2Ea5SjY3P0U.Z1Fw1e0yH2gR7kG3yO2N3mZ.tM7M1lM3mP9J.',
          email: 'mario.quiros.admin@gmail.com',
          telefono: '+50688888888',
          rol: 'ADMIN'
        }
      });

      await prisma.businessSettings.create({
        data: {
          userId: u2.id,
          monedaSimbolo: '₡',
          monedaCodigo: 'CRC',
          nombreNegocio: 'CAT-LOAN Admin',
          gananciaPorcentaje: 50
        }
      });

      await prisma.subscription.create({
        data: {
          userId: u2.id,
          tipo: 'ACTIVE',
          validUntil: new Date('2050-12-31T23:59:59.000Z')
        }
      });

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
