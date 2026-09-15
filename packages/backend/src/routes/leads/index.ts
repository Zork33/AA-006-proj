import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { leads, services, partners } from '../../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { notifyNewLead, notifyLeadStatusChange } from '../../lib/notify.js';
import { rateLimitMiddleware, honeypotCheck } from '../../lib/security.js';
import { requireAuth } from '../../lib/middleware.js';

const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email(),
  city: z.string().min(1),
  serviceId: z.number().optional(),
  messenger: z.string().optional(),
  consent: z.literal(true, { errorMap: () => ({ message: 'Требуется согласие на обработку персональных данных' }) }),
  website: z.string().optional(), // honeypot
  ref: z.string().optional(), // реферальный токен
});

function generateLeadNumber(prefix: string, id: number): string {
  return `${prefix}-${String(id).padStart(4, '0')}`;
}

export async function leadsRoutes(app: FastifyInstance) {
  // Создание заявки (публичное) — rate limit + honeypot
  app.post('/api/leads', { preHandler: [rateLimitMiddleware, honeypotCheck] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, phone, email, city, serviceId, messenger, ref: bodyRef } = parsed.data;

    // ref: сначала из body, потом из cookie (first-touch реферал)
    const ref = bodyRef || request.cookies?.ref;

    // Определение партнёра по ref-токену (до дедупликации)
    let partnerId: number | undefined;
    let source = 'QR';
    if (ref) {
      const [partner] = await db.select().from(partners).where(eq(partners.referralToken, ref));
      if (partner && partner.approvalStatus === 'approved') {
        partnerId = partner.id;
        source = 'partner';
      }
    }

    // Дедупликация: телефон + услуга + партнёр за 24ч
    if (serviceId) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const conditions = [
        eq(leads.phone, phone),
        eq(leads.serviceId, serviceId),
        gte(leads.createdAt, yesterday),
      ];
      if (partnerId) {
        conditions.push(eq(leads.partnerId, partnerId));
      } else {
        conditions.push(sql`${leads.partnerId} IS NULL`);
      }

      const [existing] = await db.select().from(leads)
        .where(and(...conditions))
        .limit(1);

      if (existing) {
        return reply.status(409).send({ error: 'Заявка уже принята', leadNumber: existing.leadNumber });
      }
    }

    // Вставка заявки с placeholder-номером
    const [lead] = await db.insert(leads).values({
      leadNumber: 'TEMP',
      name, phone, email, city, serviceId, messenger, partnerId, source,
    }).returning();

    // Обновление номера заявки
    const leadNumber = source === 'QR'
      ? generateLeadNumber('QR', lead.id)
      : generateLeadNumber('PARTNER', lead.id);
    await db.update(leads).set({ leadNumber }).where(eq(leads.id, lead.id));

    // Отправка email-уведомления
    try {
      await notifyNewLead(lead.id);
    } catch (err) {
      console.error('Ошибка отправки уведомления:', err);
    }

    return reply.status(201).send({ leadNumber, id: lead.id });
  });

  // Список заявок (админ)
  app.get('/api/leads', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const allLeads = await db.select().from(leads).orderBy(sql`${leads.createdAt} DESC`);
    return reply.status(200).send(allLeads);
  });

  // Смена статуса заявки (админ)
  app.patch('/api/leads/:id/status', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'COMPLETED', 'REJECTED', 'DUPLICATE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ error: 'Неверный статус' });
    }

    const [oldLead] = await db.select().from(leads).where(eq(leads.id, Number(id)));
    await db.update(leads).set({ status: status as any, updatedAt: new Date() }).where(eq(leads.id, Number(id)));

    // Уведомление о смене статуса
    if (oldLead) {
      try {
        await notifyLeadStatusChange(oldLead.id, oldLead.status, status);
      } catch (err) {
        console.error('Ошибка отправки уведомления:', err);
      }
    }

    return reply.status(200).send({ status });
  });
}
