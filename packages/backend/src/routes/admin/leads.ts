import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { leads } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../lib/middleware.js';

function escapeCsv(value: string | number | Date | null | undefined): string {
  const str = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (str.match(/^[=+\-@\t\r]/)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const statusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'COMPLETED', 'REJECTED', 'DUPLICATE', 'CANCELLED']),
});

export async function adminLeadsRoutes(app: FastifyInstance) {
  // Список всех заявок
  app.get('/api/admin/leads', { preHandler: requireAuth }, async (request, reply) => {
    const { status, partnerId } = request.query as { status?: string; partnerId?: string };

    let allLeads;
    if (status) {
      allLeads = await db.select().from(leads).where(eq(leads.status, status as any));
    } else if (partnerId) {
      allLeads = await db.select().from(leads).where(eq(leads.partnerId, Number(partnerId)));
    } else {
      allLeads = await db.select().from(leads);
    }

    return reply.status(200).send(allLeads);
  });

  // Детали заявки
  app.get('/api/admin/leads/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [lead] = await db.select().from(leads).where(eq(leads.id, Number(id)));
    if (!lead) {
      return reply.status(404).send({ error: 'Заявка не найдена' });
    }
    return reply.status(200).send(lead);
  });

  // Смена статуса заявки
  app.patch('/api/admin/leads/:id/status', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверный статус', details: parsed.error.flatten() });
    }

    const { status } = parsed.data;

    await db.update(leads).set({ status: status as any, updatedAt: new Date() }).where(eq(leads.id, Number(id)));
    return reply.status(200).send({ status });
  });

  // Экспорт CSV
  app.get('/api/admin/export', { preHandler: requireAuth }, async (_request, reply) => {
    const allLeads = await db.select().from(leads);

    const csv = [
      'lead_number,name,phone,email,city,service_id,partner_id,source,status,created_at',
      ...allLeads.map((l) =>
        [l.leadNumber, l.name, l.phone, l.email, l.city, l.serviceId || '', l.partnerId || '', l.source, l.status, l.createdAt].map(escapeCsv).join(',')
      ),
    ].join('\n');

    return reply.header('Content-Type', 'text/csv').send(csv);
  });
}
