import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
let prismaInstance: PrismaClient;

if (databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
} else {
  // Fallback instantiation (useful during builds or memory mode running)
  prismaInstance = new PrismaClient();
}

export const prisma = prismaInstance;


// In-Memory Database fallback for offline/development running without setup
export interface MemoryUser {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: 'ADMIN' | 'PRESTAMISTA' | 'COBRADOR';
  prestamistaId?: string; // Solo para COBRADOR
  plan?: string;
  suspendido?: boolean;
  isTrial?: boolean;
  fechaPruebaFin?: Date;
  paymentDate?: Date;
  createdAt: Date;
}

export interface MemorySubscription {
  id: string;
  userId: string;
  tipo: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  validUntil: Date;
  createdAt: Date;
}

export interface MemorySaasGlobalConfig {
  id: string;
  defaultTrialDays: number;
  supportWhatsappNumber: string;
  graceDays: number;
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
  fineAmount?: number | null;
  fineFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  graceDays?: number;
  multasAcumuladas?: number;
  montoCondonado?: number;
  tipoIdentificacion?: string | null;

  numeroIdentificacion?: string | null;
  modalidad?: 'TRADICIONAL' | 'ALQUILER';
  frecuenciaPago?: 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
}

export interface MemoryPayment {
  id: string;
  loanId: string;
  montoAbonado: number;
  numeroRecibo: string;
  notas?: string;
  metodoPago: 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA';
  creadoPorId?: string;
  tipoPago?: 'CUOTA_RENTA' | 'ABONO_CAPITAL';
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
  timezone?: string;
  nombreNegocio: string;

  plantillaWhatsapp: string;
  gananciaPorcentaje: number;
  diasMinimosPrimerCobro: number;
  modalidadPredeterminada?: 'TRADICIONAL' | 'ALQUILER';
}

export interface MemoryRefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MemoryLog {
  id: string;
  fecha: Date;
  tipoEvento: string;
  descripcion: string;
  ip: string;
  prestamistaId: string | null;
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
  logs: MemoryLog[] = [];
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

  loans: MemoryLoan[] = [
    {
      id: 'loan-mora-demo-1',
      prestamistaId: 'mock-admin-id-999',
      clienteNombre: 'Patito Cagón',
      clienteTelefono: '+50672666369',
      tipoIdentificacion: 'CEDULA_NACIONAL',
      numeroIdentificacion: '1-1234-0567',
      montoOriginal: 160000,
      totalAPagar: 200000,
      cuotaSemanal: 10000,
      diaCobro: 6,
      estado: 'ACTIVE',
      fechaInicio: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      fineAmount: 1000,
      fineFrequency: 'DAILY',
      graceDays: 0,
      multasAcumuladas: 14000,
      modalidad: 'TRADICIONAL',
      frecuenciaPago: 'SEMANAL'
    }

  ];

  payments: MemoryPayment[] = [];

  settings: MemoryBusinessSettings[] = [
    {
      id: 'sett-2',
      userId: 'mock-admin-id-999',
      monedaSimbolo: '₡',
      monedaCodigo: 'CRC',
      nombreNegocio: 'CAT-LOAN Admin',
      plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
      gananciaPorcentaje: 50,
      diasMinimosPrimerCobro: 3,
      modalidadPredeterminada: 'TRADICIONAL'
    }
  ];
  refreshTokens: MemoryRefreshToken[] = [];
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

    // Always upsert SaaS Plan Configurations (safe to run on every startup)
    const planConfigDefaults = [
      { plan: 'BRONCE' as const, maxClientes: 10, maxCobradores: 0, precioMensual: 5000 },
      { plan: 'PLATA' as const, maxClientes: 20, maxCobradores: 1, precioMensual: 7500 },
      { plan: 'ORO' as const, maxClientes: 35, maxCobradores: 2, precioMensual: 10000 },
      { plan: 'PLATINO' as const, maxClientes: 50, maxCobradores: 5, precioMensual: 20000 },
      { plan: 'DIAMANTE' as const, maxClientes: -1, maxCobradores: -1, precioMensual: 30000 }
    ];
    for (const p of planConfigDefaults) {
      await prisma.saaSPlanConfig.upsert({
        where: { plan: p.plan },
        update: {},  // Don't overwrite if admin already customized them
        create: p
      });
    }
  } catch (error: any) {
    console.error('PostgreSQL database connection failed during boot. Will retry on request.', error.message);
    useMemoryStore = false; // Do not fallback to memory store
  }

}

export function isUsingMemoryStore() {
  return useMemoryStore;
}
