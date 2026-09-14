import { FastifyInstance } from 'fastify';
import { db } from '../../db/index.js';
import { partners, leads } from '../../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../../lib/middleware.js';

export async function partnerRoutes(app: FastifyInstance) {
  // Дашборд партнёра
  app.get('/api/partner/dashboard', { preHandler: requireAuth }, async (request, reply) => {
    const partnerId = request.user?.id;
    if (!partnerId) {
      return reply.status(401).send({ error: 'Не авторизован' });
    }

    const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
    if (!partner) {
      return reply.status(404).send({ error: 'Партнёр не найден' });
    }

    const allLeads = await db.select().from(leads).where(eq(leads.partnerId, partnerId));
    const total = allLeads.length;
    const converted = allLeads.filter(l => l.status === 'CONVERTED').length;
    const newLeads = allLeads.filter(l => l.status === 'NEW').length;
    const today = allLeads.filter(l => {
      const d = new Date(l.createdAt!);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    return reply.status(200).send({
      partner: {
        id: partner.id,
        name: partner.name,
        rating: partner.rating,
        approvalStatus: partner.approvalStatus,
      },
      stats: { total, converted, new_leads: newLeads, today },
    });
  });

  // Реферальная ссылка
  app.get('/api/partner/referral', { preHandler: requireAuth }, async (request, reply) => {
    const partnerId = request.user?.id;
    if (!partnerId) {
      return reply.status(401).send({ error: 'Не авторизован' });
    }

    const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
    if (!partner) {
      return reply.status(404).send({ error: 'Партнёр не найден' });
    }

    return reply.status(200).send({
      referralToken: partner.referralToken,
      partnerCode: partner.partnerCode,
      referralLink: `https://vsyak.zork.ru/?ref=${partner.referralToken}`,
    });
  });

  // Список приглашённых
  app.get('/api/partner/invites', { preHandler: requireAuth }, async (request, reply) => {
    const partnerId = request.user?.id;
    if (!partnerId) {
      return reply.status(401).send({ error: 'Не авторизован' });
    }

    const invited = await db.select().from(partners).where(eq(partners.referrerId, partnerId));
    return reply.status(200).send(invited.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      approvalStatus: p.approvalStatus,
    })));
  });
}
