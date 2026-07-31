import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { Role } from '@prisma/client';
import { logActivity } from '../services/auditLogger';
import { AppError } from '../utils/AppError';
import { sanitizeString, sanitizePhone } from '../services/validation';

export async function getClients(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;

  // Si es COBRADOR, usar su prestamistaId
  if (userRole === Role.COBRADOR) {
    if (isUsingMemoryStore()) {
      const cobrador = inMemoryStore.users.find(u => u.id === req.user?.id);
      prestamistaId = (cobrador as any)?.prestamistaId || prestamistaId;
    } else {
      const cobrador = await prisma.user.findUnique({
        where: { id: req.user?.id },
        select: { prestamistaId: true }
      });
      prestamistaId = cobrador?.prestamistaId || prestamistaId;
    }
  }

  if (isUsingMemoryStore()) {
    const clients = inMemoryStore.clients.filter(c => c.prestamistaId === prestamistaId);
    return res.json(clients);
  }

  try {
    const clients = await prisma.client.findMany({
      where: { prestamistaId },
      include: {
        documents: true
      },
      orderBy: { nombre: 'asc' }
    });
    return res.json(clients);
  } catch (err) { next(err); }
}

export async function createClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  
  if (req.user?.rol === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden crear clientes.' });
  }

  const { nombre, telefono, tipoIdentificacion, numeroIdentificacion } = req.body;
  
  const cleanNombre = sanitizeString(nombre, 100);
  const cleanTelefono = sanitizePhone(telefono);

  if (!cleanNombre || !cleanTelefono) {
    return res.status(400).json({ error: 'Nombre y teléfono son obligatorios.' });
  }

  if (isUsingMemoryStore()) {
    const newClient: any = {
      id: `client-${Date.now()}`,
      prestamistaId,
      nombre: cleanNombre,
      telefono: cleanTelefono,
      tipoIdentificacion: tipoIdentificacion || 'CEDULA_NACIONAL',
      numeroIdentificacion: numeroIdentificacion || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryStore.clients.push(newClient);
    await logActivity(req, 'CREAR_CLIENTE', `Creó perfil del cliente ${cleanNombre}`);
    return res.status(201).json(newClient);
  }

  try {
    const client = await prisma.client.create({
      data: {
        prestamistaId,
        nombre: cleanNombre,
        telefono: cleanTelefono,
        tipoIdentificacion: tipoIdentificacion || 'CEDULA_NACIONAL',
        numeroIdentificacion: numeroIdentificacion || null,
      }
    });

    await logActivity(req, 'CREAR_CLIENTE', `Creó perfil del cliente ${cleanNombre}`);
    return res.status(201).json(client);
  } catch (err) { next(err); }
}

export async function updateClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const clientId = req.params.id;

  if (req.user?.rol === Role.COBRADOR) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  const { nombre, telefono, tipoIdentificacion, numeroIdentificacion } = req.body;
  
  const cleanNombre = nombre !== undefined ? sanitizeString(nombre, 100) : undefined;
  const cleanTelefono = telefono !== undefined ? sanitizePhone(telefono) : undefined;

  if (isUsingMemoryStore()) {
    const client = inMemoryStore.clients.find(c => c.id === clientId && c.prestamistaId === prestamistaId);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    
    if (cleanNombre) client.nombre = cleanNombre;
    if (cleanTelefono) client.telefono = cleanTelefono;
    if (tipoIdentificacion !== undefined) client.tipoIdentificacion = tipoIdentificacion;
    if (numeroIdentificacion !== undefined) client.numeroIdentificacion = numeroIdentificacion;
    
    client.updatedAt = new Date();
    await logActivity(req, 'EDITAR_CLIENTE', `Actualizó perfil del cliente ${client.nombre}`);
    return res.json({ success: true, client });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, prestamistaId }
    });

    if (!client) throw new AppError(404, 'Cliente no encontrado');

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        nombre: cleanNombre !== undefined ? cleanNombre : client.nombre,
        telefono: cleanTelefono !== undefined ? cleanTelefono : client.telefono,
        tipoIdentificacion: tipoIdentificacion !== undefined ? tipoIdentificacion : client.tipoIdentificacion,
        numeroIdentificacion: numeroIdentificacion !== undefined ? numeroIdentificacion : client.numeroIdentificacion,
      }
    });

    await logActivity(req, 'EDITAR_CLIENTE', `Actualizó perfil del cliente ${updatedClient.nombre}`);
    return res.json({ success: true, client: updatedClient });
  } catch (err) { next(err); }
}

export async function deleteClient(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const clientId = req.params.id;

  if (req.user?.rol === Role.COBRADOR) {
    return res.status(403).json({ error: 'No autorizado' });
  }

  if (isUsingMemoryStore()) {
    const idx = inMemoryStore.clients.findIndex(c => c.id === clientId && c.prestamistaId === prestamistaId);
    if (idx === -1) return res.status(404).json({ error: 'Cliente no encontrado' });
    const c = inMemoryStore.clients[idx];
    inMemoryStore.clients.splice(idx, 1);
    await logActivity(req, 'ELIMINAR_CLIENTE', `Eliminó perfil del cliente ${c.nombre}`);
    return res.json({ success: true });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, prestamistaId }
    });

    if (!client) throw new AppError(404, 'Cliente no encontrado');

    await prisma.client.delete({
      where: { id: clientId }
    });

    await logActivity(req, 'ELIMINAR_CLIENTE', `Eliminó perfil del cliente ${client.nombre}`);
    return res.json({ success: true });
  } catch (err) { next(err); }
}

export async function addClientDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const clientId = req.params.id;
  const { url, tipo } = req.body;

  if (!url || !tipo) {
    return res.status(400).json({ error: 'La URL y el tipo de documento son obligatorios.' });
  }

  if (isUsingMemoryStore()) {
    const client = inMemoryStore.clients.find(c => c.id === clientId && c.prestamistaId === prestamistaId);
    if (!client) return res.status(404).json({ error: 'Cliente no encontrado' });
    const doc: any = {
      id: `doc-${Date.now()}`,
      clientId,
      url,
      tipo,
      createdAt: new Date()
    };
    inMemoryStore.clientDocuments.push(doc);
    return res.status(201).json(doc);
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, prestamistaId }
    });

    if (!client) throw new AppError(404, 'Cliente no encontrado');

    const document = await prisma.clientDocument.create({
      data: {
        clientId,
        url,
        tipo
      }
    });

    return res.status(201).json(document);
  } catch (err) { next(err); }
}

export async function deleteClientDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const clientId = req.params.id;
  const docId = req.params.docId;

  if (isUsingMemoryStore()) {
    const docIdx = inMemoryStore.clientDocuments.findIndex(d => d.id === docId && d.clientId === clientId);
    if (docIdx === -1) return res.status(404).json({ error: 'Documento no encontrado' });
    inMemoryStore.clientDocuments.splice(docIdx, 1);
    return res.json({ success: true });
  }

  try {
    const client = await prisma.client.findFirst({
      where: { id: clientId, prestamistaId }
    });

    if (!client) throw new AppError(404, 'Cliente no encontrado');

    await prisma.clientDocument.delete({
      where: { id: docId }
    });

    return res.json({ success: true });
  } catch (err) { next(err); }
}
