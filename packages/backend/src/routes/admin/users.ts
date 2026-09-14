import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { admins } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireSuperadmin } from '../../lib/middleware.js';
import { hashPassword } from '../../lib/auth.js';

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  region: z.string().optional(),
  residentialComplex: z.string().optional(),
});

export async function adminUsersRoutes(app: FastifyInstance) {
  // Создание админа (только суперадмин)
  app.post('/api/admin/admins', { preHandler: requireSuperadmin }, async (request, reply) => {
    const parsed = createAdminSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const { name, email, region, residentialComplex } = parsed.data;

    // Проверка уникальности email
    const [existing] = await db.select().from(admins).where(eq(admins.email, email));
    if (existing) {
      return reply.status(409).send({ error: 'Пользователь уже существует' });
    }

    // Создание без пароля (пароль задаётся при первом входе)
    const [admin] = await db.insert(admins).values({
      name, email, region, residentialComplex, role: 'admin',
    }).returning();

    return reply.status(201).send({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      region: admin.region,
    });
  });

  // Список админов
  app.get('/api/admin/admins', { preHandler: requireSuperadmin }, async (_request, reply) => {
    const allAdmins = await db.select().from(admins);
    return reply.status(200).send(allAdmins.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      region: a.region,
      hasPassword: !!a.passwordHash,
    })));
  });
}
