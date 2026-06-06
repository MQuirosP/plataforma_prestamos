import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';

export async function getSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id || 'mock-lender-id-123';

  if (isUsingMemoryStore()) {
    let settings = inMemoryStore.settings.find(s => s.userId === userId);
    if (!settings) {
      settings = {
        id: `sett-${Date.now()}`,
        userId,
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: 'CAT-LOAN Credit',
        plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {saldo} {moneda}. Tu cuota programada es de {cuota} {moneda}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: 50
      };
      inMemoryStore.settings.push(settings);
    }
    return res.json(settings);
  }

  try {
    let settings = await prisma.businessSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      // Create default settings if not exists
      settings = await prisma.businessSettings.create({
        data: {
          userId,
          monedaSimbolo: '₡',
          monedaCodigo: 'CRC',
          nombreNegocio: 'CAT-LOAN Credit',
          gananciaPorcentaje: 50
        }
      });
    }

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id || 'mock-lender-id-123';
  const { monedaSimbolo, monedaCodigo, nombreNegocio, plantillaWhatsapp, gananciaPorcentaje } = req.body;

  const parsedGanancia = Number(gananciaPorcentaje) !== undefined ? Math.max(0, Number(gananciaPorcentaje)) : 50;

  if (isUsingMemoryStore()) {
    let settings = inMemoryStore.settings.find(s => s.userId === userId);
    if (!settings) {
      settings = {
        id: `sett-${Date.now()}`,
        userId,
        monedaSimbolo: monedaSimbolo || '₡',
        monedaCodigo: monedaCodigo || 'CRC',
        nombreNegocio: nombreNegocio || 'CAT-LOAN Credit',
        plantillaWhatsapp: plantillaWhatsapp || 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {saldo} {moneda}. Tu cuota programada es de {cuota} {moneda}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: parsedGanancia
      };
      inMemoryStore.settings.push(settings);
    } else {
      settings.monedaSimbolo = monedaSimbolo !== undefined ? monedaSimbolo : settings.monedaSimbolo;
      settings.monedaCodigo = monedaCodigo !== undefined ? monedaCodigo : settings.monedaCodigo;
      settings.nombreNegocio = nombreNegocio !== undefined ? nombreNegocio : settings.nombreNegocio;
      settings.plantillaWhatsapp = plantillaWhatsapp !== undefined ? plantillaWhatsapp : settings.plantillaWhatsapp;
      settings.gananciaPorcentaje = parsedGanancia;
    }
    return res.json(settings);
  }

  try {
    const settings = await prisma.businessSettings.upsert({
      where: { userId },
      update: {
        monedaSimbolo,
        monedaCodigo,
        nombreNegocio,
        plantillaWhatsapp,
        gananciaPorcentaje: parsedGanancia
      },
      create: {
        userId,
        monedaSimbolo: monedaSimbolo || '₡',
        monedaCodigo: monedaCodigo || 'CRC',
        nombreNegocio: nombreNegocio || 'CAT-LOAN Credit',
        plantillaWhatsapp,
        gananciaPorcentaje: parsedGanancia
      }
    });

    return res.json(settings);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
}
