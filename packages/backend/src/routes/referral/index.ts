import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { visits, partners } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function referralRoutes(app: FastifyInstance) {
  app.get('/api/referral/track', async (request, reply) => {
    const { ref } = request.query as { ref?: string };

    if (!ref) {
      return reply.status(200).send({ tracked: false });
    }

    const [partner] = await db.select().from(partners).where(eq(partners.referralToken, ref));
    if (!partner || partner.approvalStatus !== 'approved') {
      return reply.status(200).send({ tracked: false });
    }

    reply.setCookie('ref', ref, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: true,
    });

    const sessionId = crypto.randomUUID();
    await db.insert(visits).values({
      sessionId,
      partnerId: partner.id,
      source: 'partner',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(200).send({ tracked: true, partnerId: partner.id });
  });

  app.get('/api/referral/current', async (request, reply) => {
    const ref = request.cookies?.ref;
    if (!ref) {
      return reply.status(200).send({ ref: null });
    }

    const [partner] = await db.select().from(partners).where(eq(partners.referralToken, ref));
    if (!partner || partner.approvalStatus !== 'approved') {
      return reply.status(200).send({ ref: null });
    }

    return reply.status(200).send({ ref, partnerId: partner.id, partnerName: partner.name });
  });
}
