import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { Role, LiquidacionEstado } from '@prisma/client';
import { logger } from '../services/logger';

/**
 * GET /api/caja/:cobradorId
 * Retorna el resumen de caja actual del cobrador (solo accesible para el Prestamista dueño o Admin)
 */
export async function getCajaCobrador(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { cobradorId } = req.params;
  const requestorRole = req.user?.rol;

  if (requestorRole !== Role.ADMIN && requestorRole !== Role.PRESTAMISTA) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el prestamista puede ver la caja.' });
  }

  if (isUsingMemoryStore()) {
    const cobrador = inMemoryStore.users.find(u => u.id === cobradorId && u.rol === Role.COBRADOR);
    if (!cobrador) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    const caja = inMemoryStore.cajas.find(c => c.cobradorId === cobradorId) || {
      cobradorId,
      saldoEfectivo: 0,
      saldoSinpe: 0,
      saldoTransferencia: 0
    };

    return res.json({
      cobrador: { id: cobrador.id, nombre: cobrador.nombre, email: cobrador.email },
      caja,
      total: Number(caja.saldoEfectivo) + Number(caja.saldoSinpe) + Number(caja.saldoTransferencia)
    });
  }

  try {
    const cobrador = await prisma.user.findUnique({
      where: { id: cobradorId }
    });

    if (!cobrador || cobrador.rol !== Role.COBRADOR) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    let caja = await prisma.cajaCobrador.findUnique({
      where: { cobradorId }
    });

    if (!caja) {
      // Caja vacía — no ha cobrado nada aún
      return res.json({
        cobrador: { id: cobrador.id, nombre: cobrador.nombre, email: cobrador.email },
        caja: { saldoEfectivo: 0, saldoSinpe: 0, saldoTransferencia: 0 },
        total: 0
      });
    }

    return res.json({
      cobrador: { id: cobrador.id, nombre: cobrador.nombre, email: cobrador.email },
      caja: {
        saldoEfectivo: Number(caja.saldoEfectivo),
        saldoSinpe: Number(caja.saldoSinpe),
        saldoTransferencia: Number(caja.saldoTransferencia)
      },
      total: Number(caja.saldoEfectivo) + Number(caja.saldoSinpe) + Number(caja.saldoTransferencia)
    });
  } catch (err: any) { next(err); }
}

/**
 * GET /api/liquidaciones/resumen/:cobradorId
 * Alias del endpoint de caja para el panel del prestamista
 */
export async function getResumenLiquidacion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  return getCajaCobrador(req, res, next);
}

/**
 * POST /api/liquidaciones/procesar
 * El prestamista procesa la liquidación: verifica montos, registra el historial y resetea la caja del cobrador a 0
 */
export async function procesarLiquidacion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const requestorRole = req.user?.rol;
  const prestamistaId = req.user?.id;

  if (requestorRole !== Role.ADMIN && requestorRole !== Role.PRESTAMISTA) {
    return res.status(403).json({ error: 'Acceso denegado. Solo el prestamista puede procesar liquidaciones.' });
  }

  const { cobradorId, notas } = req.body;

  if (!cobradorId) {
    return res.status(400).json({ error: 'cobradorId es requerido' });
  }

  if (isUsingMemoryStore()) {
    const cajaIdx = inMemoryStore.cajas.findIndex(c => c.cobradorId === cobradorId);

    if (cajaIdx === -1) {
      return res.status(404).json({ error: 'Caja del cobrador no encontrada o está en cero' });
    }

    const caja = inMemoryStore.cajas[cajaIdx];
    const montoTotal = Number(caja.saldoEfectivo) + Number(caja.saldoSinpe) + Number(caja.saldoTransferencia);

    // Registrar liquidación
    const liquidacion = {
      id: `liq-${Date.now()}`,
      prestamistaId: prestamistaId || 'mock-lender-id-123',
      cobradorId,
      montoEfectivo: caja.saldoEfectivo,
      montoSinpe: caja.saldoSinpe,
      montoTransferencia: caja.saldoTransferencia,
      montoTotal,
      estado: LiquidacionEstado.LIQUIDATED,
      notas: notas || null,
      fecha: new Date()
    };
    inMemoryStore.liquidaciones.push(liquidacion);

    // Resetear caja
    caja.saldoEfectivo = 0;
    caja.saldoSinpe = 0;
    caja.saldoTransferencia = 0;

    return res.json({ success: true, liquidacion });
  }

  try {
    const caja = await prisma.cajaCobrador.findUnique({
      where: { cobradorId }
    });

    if (!caja) {
      return res.status(404).json({ error: 'Caja del cobrador no encontrada o está en cero' });
    }

    const montoTotal = Number(caja.saldoEfectivo) + Number(caja.saldoSinpe) + Number(caja.saldoTransferencia);

    // Transacción: registrar liquidación + resetear caja
    const liquidacion = await prisma.$transaction(async (tx) => {
      const liq = await tx.liquidacion.create({
        data: {
          prestamistaId: prestamistaId || '',
          cobradorId,
          montoEfectivo: caja.saldoEfectivo,
          montoSinpe: caja.saldoSinpe,
          montoTransferencia: caja.saldoTransferencia,
          montoTotal,
          estado: LiquidacionEstado.LIQUIDATED,
          notas: notas || null
        }
      });

      await tx.cajaCobrador.update({
        where: { cobradorId },
        data: {
          saldoEfectivo: 0,
          saldoSinpe: 0,
          saldoTransferencia: 0
        }
      });

      return liq;
    });

    return res.json({ success: true, liquidacion });
  } catch (err: any) { next(err); }
}
