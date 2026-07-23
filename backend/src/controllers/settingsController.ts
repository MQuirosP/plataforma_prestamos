import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
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
        plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: 50,
        diasMinimosPrimerCobro: 3
      };
      inMemoryStore.settings.push(settings);
    }
    
    const user = inMemoryStore.users.find(u => u.id === userId);
    return res.json({
      ...settings,
      telefono: user?.telefono || ''
    });
  }

  try {
    let settings = await prisma.businessSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
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

    const user = await prisma.user.findUnique({ where: { id: userId } });

    return res.json({
      ...settings,
      telefono: user?.telefono || ''
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id || 'mock-lender-id-123';
  const { monedaSimbolo, monedaCodigo, nombreNegocio, plantillaWhatsapp, gananciaPorcentaje, diasMinimosPrimerCobro, telefono } = req.body;

  const parsedGanancia = Number(gananciaPorcentaje) !== undefined ? Math.max(0, Number(gananciaPorcentaje)) : 50;
  const parsedDiasMinimos = diasMinimosPrimerCobro !== undefined && diasMinimosPrimerCobro !== null ? Math.max(0, Number(diasMinimosPrimerCobro)) : 3;

  if (isUsingMemoryStore()) {
    let settings = inMemoryStore.settings.find(s => s.userId === userId);
    if (!settings) {
      settings = {
        id: `sett-${Date.now()}`,
        userId,
        monedaSimbolo: monedaSimbolo || '₡',
        monedaCodigo: monedaCodigo || 'CRC',
        nombreNegocio: nombreNegocio || 'CAT-LOAN Credit',
        plantillaWhatsapp: plantillaWhatsapp || 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: parsedGanancia,
        diasMinimosPrimerCobro: parsedDiasMinimos
      };
      inMemoryStore.settings.push(settings);
    } else {
      settings.monedaSimbolo = monedaSimbolo !== undefined ? monedaSimbolo : settings.monedaSimbolo;
      settings.monedaCodigo = monedaCodigo !== undefined ? monedaCodigo : settings.monedaCodigo;
      settings.nombreNegocio = nombreNegocio !== undefined ? nombreNegocio : settings.nombreNegocio;
      settings.plantillaWhatsapp = plantillaWhatsapp !== undefined ? plantillaWhatsapp : settings.plantillaWhatsapp;
      settings.gananciaPorcentaje = parsedGanancia;
      settings.diasMinimosPrimerCobro = parsedDiasMinimos;
    }

    if (telefono) {
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.telefono = telefono;
      }
    }

    return res.json({ ...settings, telefono });
  }

  try {
    const settings = await prisma.$transaction(async (tx) => {
      const sett = await tx.businessSettings.upsert({
        where: { userId },
        update: {
          monedaSimbolo,
          monedaCodigo,
          nombreNegocio,
          plantillaWhatsapp,
          gananciaPorcentaje: parsedGanancia,
          diasMinimosPrimerCobro: parsedDiasMinimos
        },
        create: {
          userId,
          monedaSimbolo: monedaSimbolo || '₡',
          monedaCodigo: monedaCodigo || 'CRC',
          nombreNegocio: nombreNegocio || 'CAT-LOAN Credit',
          plantillaWhatsapp,
          gananciaPorcentaje: parsedGanancia,
          diasMinimosPrimerCobro: parsedDiasMinimos
        }
      });

      if (telefono) {
        await tx.user.update({
          where: { id: userId },
          data: { telefono }
        });
      }

      return sett;
    });

    return res.json({
      ...settings,
      telefono
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
}
