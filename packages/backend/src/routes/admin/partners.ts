import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { partners, users, userRoles, referralCodes } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireSuperAdmin } from '../../lib/middleware.js';
import { hashPassword } from '../../lib/auth.js';

const createPartnerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminName: z.string().min(1),
});

const updatePartnerSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['active', 'pending', 'rejected', 'suspended']).optional(),
});

export async function adminPartnersRoutes(app: FastifyInstance) {
  app.post('/api/admin/partners', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = createPartnerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, slug, adminEmail, adminName } = parsed.data;

    const [existingPartner] = await db.select().from(partners).where(eq(partners.slug, slug));
    if (existingPartner) {
      return reply.status(409).send({ error: 'Партнёр с таким slug уже существует' });
    }

    let adminUser = (await db.select().from(users).where(eq(users.email, adminEmail)))[0];
    if (!adminUser) {
      const passwordHash = await hashPassword('changeme123');
      [adminUser] = await db.insert(users).values({
        email: adminEmail,
        name: adminName,
        passwordHash,
        status: 'active',
      }).returning();
    }

    const [partner] = await db.insert(partners).values({
      name,
      slug,
      status: 'active',
      createdBy: request.user?.id,
    }).returning();

    await db.insert(userRoles).values({
      userId: adminUser.id,
      role: 'partner_admin',
      partnerId: partner.id,
      accessLevel: 'full',
      createdBy: request.user?.id,
    });

    const referralCode = `${slug.toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await db.insert(referralCodes).values({
      code: referralCode,
      type: 'partner_invite',
      createdByUserId: adminUser.id,
      ownerPartnerId: partner.id,
      targetType: 'partner',
    });

    return reply.status(201).send({ partner, admin: { id: adminUser.id, email: adminUser.email } });
  });

  app.get('/api/admin/partners', { preHandler: requireAuth }, async (_request, reply) => {
    const allPartners = await db.select().from(partners);
    return reply.status(200).send(allPartners);
  });

  app.get('/api/admin/partners/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [partner] = await db.select().from(partners).where(eq(partners.id, id));
    if (!partner) {
      return reply.status(404).send({ error: 'Партнёр не найден' });
    }

    const roles = await db.select().from(userRoles).where(eq(userRoles.partnerId, id));
    const codes = await db.select().from(referralCodes).where(eq(referralCodes.ownerPartnerId, id));

    return reply.status(200).send({ partner, roles, codes });
  });

  app.patch('/api/admin/partners/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updatePartnerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const [updated] = await db.update(partners)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'Партнёр не найден' });
    }

    return reply.status(200).send(updated);
  });

  app.delete('/api/admin/partners/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [deleted] = await db.update(partners)
      .set({ status: 'suspended', updatedAt: new Date() })
      .where(eq(partners.id, id))
      .returning();

    if (!deleted) {
      return reply.status(404).send({ error: 'Партнёр не найден' });
    }

    return reply.status(200).send({ ok: true });
  });
}
