import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { login, register, refresh, setupPassword, requestPasswordReset } from '../../lib/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string(),
});

const setupPasswordSchema = z.object({
  adminId: z.number(),
  newPassword: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) {
      return reply.status(401).send({ error: 'Неверный email или пароль' });
    }

    if ('needPasswordSetup' in result) {
      return reply.status(200).send({ needPasswordSetup: true, adminId: result.adminId, email: result.email });
    }

    return reply.status(200).send(result);
  });

  app.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const result = await register(parsed.data.name, parsed.data.email, parsed.data.password);
    if (!result) {
      return reply.status(409).send({ error: 'Пользователь уже существует' });
    }

    return reply.status(201).send(result);
  });

  app.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Требуется refreshToken' });
    }

    const result = await refresh(parsed.data.refreshToken);
    if (!result) {
      return reply.status(401).send({ error: 'Невалидный токен' });
    }

    return reply.status(200).send(result);
  });

  app.post('/api/auth/setup-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = setupPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const result = await setupPassword(parsed.data.adminId, parsed.data.newPassword);
    if (!result) {
      return reply.status(404).send({ error: 'Пользователь не найден' });
    }

    return reply.status(200).send(result);
  });

  app.post('/api/auth/reset', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email?: string };
    if (!email) {
      return reply.status(400).send({ error: 'Требуется email' });
    }

    const result = await requestPasswordReset(email);
    return reply.status(200).send(result);
  });
}
