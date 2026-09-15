import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { visits, referralCodes, partners } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function referralRoutes(app: FastifyInstance) {
  app.get('/api/referral/track', async (request, reply) => {
    const { ref } = request.query as { ref?: string };

    if (!ref) {
      return reply.status(200).send({ tracked: false });
    }

    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.code, ref));
    if (!code || !code.isActive || !code.ownerPartnerId) {
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
      partnerId: code.ownerPartnerId,
      source: 'partner',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || '',
    });

    return reply.status(200).send({ tracked: true, partnerId: code.ownerPartnerId });
  });

  app.get('/api/referral/current', async (request, reply) => {
    const ref = request.cookies?.ref;
    if (!ref) {
      return reply.status(200).send({ ref: null });
    }

    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.code, ref));
    if (!code || !code.isActive || !code.ownerPartnerId) {
      return reply.status(200).send({ ref: null });
    }

    const [partner] = await db.select().from(partners).where(eq(partners.id, code.ownerPartnerId));
    return reply.status(200).send({ ref, partnerId: code.ownerPartnerId, partnerName: partner?.name });
  });
}
