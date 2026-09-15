import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { users, userRoles } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireSuperAdmin, requireAuth } from '../../lib/middleware.js';

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['super_admin', 'partner_admin', 'service_user']),
  partnerId: z.string().uuid().optional(),
  accessLevel: z.enum(['full', 'view_only']).optional(),
});

export async function adminUsersRoutes(app: FastifyInstance) {
  app.post('/api/admin/users', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = createAdminSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, email } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) {
      return reply.status(409).send({ error: 'Пользователь уже существует' });
    }

    const [user] = await db.insert(users).values({
      name, email, status: 'active',
    }).returning();

    return reply.status(201).send({ id: user.id, name: user.name, email: user.email });
  });

  app.get('/api/admin/users', { preHandler: requireAuth }, async (_request, reply) => {
    const allUsers = await db.select().from(users);
    return reply.status(200).send(allUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      isSuperAdmin: u.isSuperAdmin,
      hasPassword: !!u.passwordHash,
      createdAt: u.createdAt,
    })));
  });

  app.get('/api/admin/users/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return reply.status(404).send({ error: 'Пользователь не найден' });
    }

    const roles = await db.select().from(userRoles).where(eq(userRoles.userId, id));
    return reply.status(200).send({ user: { ...user, passwordHash: undefined }, roles });
  });

  app.post('/api/admin/roles', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const parsed = assignRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { userId, role, partnerId, accessLevel } = parsed.data;

    if (role === 'partner_admin' && !partnerId) {
      return reply.status(400).send({ error: 'partner_admin обязан иметь partner_id' });
    }

    if (role === 'super_admin' && partnerId) {
      return reply.status(400).send({ error: 'super_admin не может быть привязан к партнёру' });
    }

    if (role !== 'partner_admin' && accessLevel) {
      return reply.status(400).send({ error: 'access_level только для partner_admin' });
    }

    const [newRole] = await db.insert(userRoles).values({
      userId, role, partnerId: partnerId || null, accessLevel: accessLevel || null,
      createdBy: request.user?.id,
    }).returning();

    return reply.status(201).send(newRole);
  });

  app.delete('/api/admin/roles/:id', { preHandler: requireSuperAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [role] = await db.select().from(userRoles).where(eq(userRoles.id, id));
    if (!role) {
      return reply.status(404).send({ error: 'Роль не найдена' });
    }

    if (role.role === 'super_admin') {
      const superAdminCount = await db.select().from(userRoles).where(eq(userRoles.role, 'super_admin'));
      if (superAdminCount.length <= 1) {
        return reply.status(400).send({ error: 'Нельзя удалить последнего super_admin' });
      }
    }

    await db.delete(userRoles).where(eq(userRoles.id, id));
    return reply.status(200).send({ ok: true });
  });
}
