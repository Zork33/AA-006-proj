import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { leadFeedback, leads, partners } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const feedbackSchema = z.object({
  leadNumber: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/api/feedback', async (request, reply) => {
    const parsed = feedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { leadNumber, rating, comment } = parsed.data;

    const [lead] = await db.select().from(leads).where(eq(leads.leadNumber, leadNumber));
    if (!lead) {
      return reply.status(404).send({ error: 'Заявка не найдена' });
    }

    const [existing] = await db.select().from(leadFeedback).where(eq(leadFeedback.leadId, lead.id));
    if (existing) {
      return reply.status(409).send({ error: 'Отзыв уже был оставлен' });
    }

    await db.insert(leadFeedback).values({ leadId: lead.id, rating, comment });

    if (lead.partnerId) {
      const delta = rating >= 4 ? 2 : rating <= 2 ? -3 : 0;
      if (delta !== 0) {
        await db.execute(sql`
          UPDATE partners
          SET status = status,
              updated_at = NOW()
          WHERE id = ${lead.partnerId}
        `);
      }
    }

    await db.update(leads).set({ status: 'COMPLETED', updatedAt: new Date() }).where(eq(leads.id, lead.id));

    return reply.status(201).send({ success: true });
  });
}
