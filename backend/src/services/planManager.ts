import { PlanSaaS } from '@prisma/client';
import { prisma, isUsingMemoryStore } from './db';

// Fallback in-memory config in case DB is not available
const fallbackPlanConfigs: Record<PlanSaaS, { maxClientes: number; maxCobradores: number; precioMensual: number }> = {
  BRONCE: { maxClientes: 10, maxCobradores: 0, precioMensual: 5000 },
  PLATA: { maxClientes: 20, maxCobradores: 1, precioMensual: 7500 },
  ORO: { maxClientes: 35, maxCobradores: 2, precioMensual: 10000 },
  PLATINO: { maxClientes: 50, maxCobradores: 5, precioMensual: 20000 },
  DIAMANTE: { maxClientes: -1, maxCobradores: -1, precioMensual: 30000 }
};

export class PlanManager {
  static async getPlanConfig(plan: PlanSaaS) {
    if (isUsingMemoryStore()) {
      return fallbackPlanConfigs[plan];
    }

    try {
      const config = await prisma.saaSPlanConfig.findUnique({
        where: { plan }
      });
      return config || fallbackPlanConfigs[plan];
    } catch (err) {
      console.error('Error fetching plan config from DB:', err);
      return fallbackPlanConfigs[plan];
    }
  }

  static async getAllPlanConfigs() {
    if (isUsingMemoryStore()) {
      return Object.entries(fallbackPlanConfigs).map(([plan, data]) => ({ plan, ...data }));
    }

    try {
      const configs = await prisma.saaSPlanConfig.findMany({
        orderBy: { precioMensual: 'asc' }
      });
      return configs.map(c => ({
        ...c,
        precioMensual: Number(c.precioMensual)
      }));
    } catch (err) {
      console.error('Error fetching all plan configs from DB:', err);
      return Object.entries(fallbackPlanConfigs).map(([plan, data]) => ({ plan, ...data }));
    }
  }

  static async updatePlanConfig(plan: PlanSaaS, maxClientes: number, maxCobradores: number, precioMensual: number) {
    if (isUsingMemoryStore()) {
      fallbackPlanConfigs[plan] = { maxClientes, maxCobradores, precioMensual };
      return fallbackPlanConfigs[plan];
    }

    try {
      const config = await prisma.saaSPlanConfig.update({
        where: { plan },
        data: { maxClientes, maxCobradores, precioMensual }
      });
      return {
        ...config,
        precioMensual: Number(config.precioMensual)
      };
    } catch (err) {
      throw new Error(`Could not update plan config for ${plan}: ${err}`);
    }
  }
}
