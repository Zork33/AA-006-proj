import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { partners } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  partnerCode: z.string().min(1),
});

export async function partnerRegisterRoutes(app: FastifyInstance) {
  app.post('/api/partners/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, email, partnerCode } = parsed.data;

    // Ищем партнёра-реферера по коду
    const [referrer] = await db.select().from(partners).where(eq(partners.partnerCode, partnerCode));
    if (!referrer) {
      return reply.status(404).send({ error: 'Промо-код не найден' });
    }

    const referralToken = `ref-${crypto.randomUUID().slice(0, 8)}`;
    const newPartnerCode = `P-${Date.now().toString(36).toUpperCase()}`;

    const [partner] = await db.insert(partners).values({
      name, email,
      partnerCode: newPartnerCode,
      referralToken,
      referrerId: referrer.id,
    }).returning();

    return reply.status(201).send({
      id: partner.id,
      partnerCode: partner.partnerCode,
      referralToken: partner.referralToken,
      status: partner.approvalStatus,
    });
  });
}
