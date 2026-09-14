import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../db/index.js';
import { services } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth, requireSuperadmin } from '../../lib/middleware.js';

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().int().positive().optional(),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().int().positive().nullable().optional(),
  status: z.enum(['active', 'hidden']).optional(),
});

export async function adminServicesRoutes(app: FastifyInstance) {
  // Создание услуги (суперадмин)
  app.post('/api/admin/services', { preHandler: requireSuperadmin }, async (request, reply) => {
    const parsed = createServiceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const [service] = await db.insert(services).values(parsed.data).returning();
    return reply.status(201).send(service);
  });

  // Редактирование услуги
  app.patch('/api/admin/services/:id', { preHandler: requireSuperadmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateServiceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const [updated] = await db.update(services)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(services.id, Number(id)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ error: 'Услуга не найдена' });
    }

    return reply.status(200).send(updated);
  });
}
