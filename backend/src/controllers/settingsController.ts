import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { sanitizeString, sanitizePhone, validatePositiveNumber, validateIntegerRange } from '../services/validation';
import { logActivity } from '../services/auditLogger';

export async function getSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
        diasMinimosPrimerCobro: 3,
        modalidadPredeterminada: 'TRADICIONAL'
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
          gananciaPorcentaje: 50,
          modalidadPredeterminada: 'TRADICIONAL'
        }
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    return res.json({
      ...settings,
      telefono: user?.telefono || ''
    });
  } catch (err: any) { next(err); }
}

export async function updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id || 'mock-lender-id-123';
  const { monedaSimbolo, monedaCodigo, nombreNegocio, plantillaWhatsapp, gananciaPorcentaje, diasMinimosPrimerCobro, telefono, modalidadPredeterminada } = req.body;

  const cleanSimbolo = sanitizeString(monedaSimbolo, 10) || '₡';
  const cleanCodigo = sanitizeString(monedaCodigo, 10) || 'CRC';
  const cleanNombre = sanitizeString(nombreNegocio, 100) || 'CAT-LOAN Credit';
  const cleanPlantilla = sanitizeString(plantillaWhatsapp, 500) || 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!';
  const cleanTelefono = telefono ? sanitizePhone(telefono) : undefined;
  const cleanModalidad = (modalidadPredeterminada === 'ALQUILER') ? 'ALQUILER' : 'TRADICIONAL';

  const validGanancia = validatePositiveNumber(gananciaPorcentaje, true);
  const parsedGanancia = validGanancia !== null ? Math.min(500, validGanancia) : 50;

  const validDiasMinimos = validateIntegerRange(diasMinimosPrimerCobro, 0, 365);
  const parsedDiasMinimos = validDiasMinimos !== null ? validDiasMinimos : 3;

  if (isUsingMemoryStore()) {
    let settings = inMemoryStore.settings.find(s => s.userId === userId);
    if (!settings) {
      settings = {
        id: `sett-${Date.now()}`,
        userId,
        monedaSimbolo: cleanSimbolo,
        monedaCodigo: cleanCodigo,
        nombreNegocio: cleanNombre,
        plantillaWhatsapp: cleanPlantilla,
        gananciaPorcentaje: parsedGanancia,
        diasMinimosPrimerCobro: parsedDiasMinimos,
        modalidadPredeterminada: cleanModalidad
      };
      inMemoryStore.settings.push(settings);
    } else {
      settings.monedaSimbolo = cleanSimbolo;
      settings.monedaCodigo = cleanCodigo;
      settings.nombreNegocio = cleanNombre;
      settings.plantillaWhatsapp = cleanPlantilla;
      settings.gananciaPorcentaje = parsedGanancia;
      settings.diasMinimosPrimerCobro = parsedDiasMinimos;
      settings.modalidadPredeterminada = cleanModalidad;
    }

    if (cleanTelefono) {
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (user) {
        user.telefono = cleanTelefono;
      }
    }

    await logActivity(req, 'ACTUALIZAR_SETTINGS', `Actualizó configuración del negocio: ${cleanNombre}`);
    return res.json({ ...settings, telefono: cleanTelefono || '' });
  }

  try {
    const settings = await prisma.$transaction(async (tx) => {
      const sett = await tx.businessSettings.upsert({
        where: { userId },
        update: {
          monedaSimbolo: cleanSimbolo,
          monedaCodigo: cleanCodigo,
          nombreNegocio: cleanNombre,
          plantillaWhatsapp: cleanPlantilla,
          gananciaPorcentaje: parsedGanancia,
          diasMinimosPrimerCobro: parsedDiasMinimos,
          modalidadPredeterminada: cleanModalidad
        },
        create: {
          userId,
          monedaSimbolo: cleanSimbolo,
          monedaCodigo: cleanCodigo,
          nombreNegocio: cleanNombre,
          plantillaWhatsapp: cleanPlantilla,
          gananciaPorcentaje: parsedGanancia,
          diasMinimosPrimerCobro: parsedDiasMinimos,
          modalidadPredeterminada: cleanModalidad
        }
      });

      if (cleanTelefono) {
        await tx.user.update({
          where: { id: userId },
          data: { telefono: cleanTelefono }
        });
      }

      return sett;
    });

    await logActivity(req, 'ACTUALIZAR_SETTINGS', `Actualizó configuración del negocio: ${cleanNombre}`);
    return res.json({
      ...settings,
      telefono: cleanTelefono || ''
    });
  } catch (err: any) { next(err); }
}
