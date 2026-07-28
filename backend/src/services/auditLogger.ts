import { prisma, isUsingMemoryStore, inMemoryStore } from './db';
import { logger } from './logger';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export async function logActivity(
  req: AuthenticatedRequest,
  tipoEvento: string,
  descripcion: string
) {
  if (!req.user) return;
  
  // Resolve target prestamistaId (the lender/tenant context)
  let prestamistaId: string | null = null;
  
  if (req.user.rol === 'PRESTAMISTA') {
    prestamistaId = req.user.id;
  } else if (req.user.rol === 'COBRADOR') {
    prestamistaId = req.user.prestamistaId || null;
  } else if (req.user.rol === 'ADMIN') {
    prestamistaId = req.user.id;
  }

  // Prepend executor information for rich tracking
  const executorName = req.user.nombre || req.user.email || 'Usuario';
  const executorRole = req.user.rol;
  const enrichedDescription = `[${executorRole}: ${executorName}] ${descripcion}`;

  if (isUsingMemoryStore()) {
    inMemoryStore.logs.push({
      id: Math.random().toString(),
      fecha: new Date(),
      tipoEvento,
      descripcion: enrichedDescription,
      ip: req.ip || '0.0.0.0',
      prestamistaId
    });
    return;
  }

  try {
    await prisma.logActividadSaaS.create({
      data: {
        tipoEvento,
        descripcion: enrichedDescription,
        ip: req.ip || '0.0.0.0',
        prestamistaId
      }
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to log audit activity');
  }
}
