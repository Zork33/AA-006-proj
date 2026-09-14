import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { partners } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, requireSuperadmin } from '../../lib/middleware.js';

const createPartnerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  region: z.string().optional(),
  residentialComplex: z.string().optional(),
});

const approveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export async function adminPartnersRoutes(app: FastifyInstance) {
  // Создание партнёра (только суперадмин)
  app.post('/api/admin/partners', { preHandler: requireSuperadmin }, async (request, reply) => {
    const parsed = createPartnerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, email, region, residentialComplex } = parsed.data;
    const partnerCode = `P-${Date.now().toString(36).toUpperCase()}`;
    const referralToken = `ref-${crypto.randomUUID().slice(0, 8)}`;

    const [partner] = await db.insert(partners).values({
      name, email, partnerCode, referralToken, region, residentialComplex,
    }).returning();

    return reply.status(201).send(partner);
  });

  // Список партнёров (фильтр по региону)
  app.get('/api/admin/partners', { preHandler: requireAuth }, async (request, reply) => {
    const { region } = request.query as { region?: string };

    let allPartners;
    if (region) {
      allPartners = await db.select().from(partners).where(eq(partners.region, region));
    } else {
      allPartners = await db.select().from(partners);
    }

    return reply.status(200).send(allPartners);
  });

  // Апровал/отклонение партнёра
  app.patch('/api/admin/partners/:id/approve', { preHandler: requireSuperadmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = approveSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные' });
    }

    const { status } = parsed.data;
    await db.update(partners).set({
      approvalStatus: status,
      approvedBy: request.user?.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(partners.id, Number(id)));

    return reply.status(200).send({ status });
  });

  // Обновление рейтинга партнёра (вызывается при событиях)
  app.patch('/api/admin/partners/:id/rating', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { delta } = request.body as { delta: number };

    // Безопасное обновление рейтинга в пределах 0–100
    await db.execute(sql`
      UPDATE partners
      SET rating = GREATEST(0, LEAST(100, rating + ${delta})),
          updated_at = NOW()
      WHERE id = ${Number(id)}
    `);

    const [partner] = await db.select().from(partners).where(eq(partners.id, Number(id)));
    return reply.status(200).send({ rating: partner?.rating });
  });
}
