import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db/index.js';
import { services } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function servicesRoutes(app: FastifyInstance) {
  app.get('/api/services', async (_request: FastifyRequest, reply: FastifyReply) => {
    const allServices = await db.select().from(services).where(eq(services.status, 'active'));
    return reply.status(200).send(allServices);
  });
}
