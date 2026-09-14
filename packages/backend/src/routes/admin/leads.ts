import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { leads } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../../lib/middleware.js';

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

  // Смена статуса заявки
  app.patch('/api/admin/leads/:id/status', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'COMPLETED', 'REJECTED', 'DUPLICATE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Неверный статус' });
    }

    await db.update(leads).set({ status: status as any, updatedAt: new Date() }).where(eq(leads.id, Number(id)));
    return reply.status(200).send({ status });
  });

  // Экспорт CSV
  app.get('/api/admin/export', { preHandler: requireAuth }, async (_request, reply) => {
    const allLeads = await db.select().from(leads);

    const csv = [
      'lead_number,name,phone,email,city,service_id,partner_id,source,status,created_at',
      ...allLeads.map((l) =>
        `${l.leadNumber},${l.name},${l.phone},${l.email},${l.city},${l.serviceId || ''},${l.partnerId || ''},${l.source},${l.status},${l.createdAt}`
      ),
    ].join('\n');

    return reply.header('Content-Type', 'text/csv').send(csv);
  });
}
