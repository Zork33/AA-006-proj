import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { login, register, refresh, requestPasswordReset, hashPassword } from '../../lib/auth.js';
import { rateLimitMiddleware } from '../../lib/security.js';
import { verifyResetToken } from '../../lib/jwt.js';
import { db } from '../../db/index.js';
import { admins } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  reply.setCookie('access_token', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 }); // 15 min
  reply.setCookie('refresh_token', refreshToken, { ...COOKIE_OPTIONS, maxAge: 30 * 24 * 60 * 60 }); // 30 days
}

function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie('access_token', { path: '/' });
  reply.clearCookie('refresh_token', { path: '/' });
}

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
  token: z.string(),
  newPassword: z.string().min(8),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', { preHandler: rateLimitMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const result = await login(parsed.data.email, parsed.data.password);
    if (!result) {
      return reply.status(401).send({ error: 'Неверный email или пароль' });
    }

    if ('needPasswordSetup' in result) {
      return reply.status(200).send({ needPasswordSetup: true, email: result.email });
    }

    setAuthCookies(reply, result.accessToken, result.refreshToken);
    return reply.status(200).send({ admin: result.admin });
  });

  app.post('/api/auth/register', { preHandler: rateLimitMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    const result = await register(parsed.data.name, parsed.data.email, parsed.data.password);
    if (!result) {
      return reply.status(409).send({ error: 'Пользователь уже существует' });
    }

    setAuthCookies(reply, result.accessToken, result.refreshToken);
    return reply.status(201).send({ admin: result.admin });
  });

  app.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      return reply.status(401).send({ error: 'Требуется refreshToken' });
    }

    const result = await refresh(refreshToken);
    if (!result) {
      clearAuthCookies(reply);
      return reply.status(401).send({ error: 'Невалидный токен' });
    }

    setAuthCookies(reply, result.accessToken, result.refreshToken);
    return reply.status(200).send({ ok: true });
  });

  app.post('/api/auth/setup-password', { preHandler: rateLimitMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = setupPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Неверные данные', details: parsed.error.flatten() });
    }

    let adminId: number;
    try {
      const decoded = verifyResetToken(parsed.data.token);
      adminId = decoded.id;
    } catch {
      return reply.status(401).send({ error: 'Невалидный или просроченный токен' });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.update(admins).set({ passwordHash, updatedAt: new Date() }).where(eq(admins.id, adminId));

    const [admin] = await db.select().from(admins).where(eq(admins.id, adminId));
    if (!admin) {
      return reply.status(404).send({ error: 'Пользователь не найден' });
    }

    const { signAccessToken, signRefreshToken } = await import('../../lib/jwt.js');
    const payload = { id: admin.id, email: admin.email, role: admin.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    
    setAuthCookies(reply, accessToken, refreshToken);
    return reply.status(200).send({
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  });

  app.post('/api/auth/reset', { preHandler: rateLimitMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const resetSchema = z.object({ email: z.string().email() });
    const parsed = resetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Невалидный email' });
    }

    const result = await requestPasswordReset(parsed.data.email);
    return reply.status(200).send(result);
  });

  app.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    clearAuthCookies(reply);
    return reply.status(200).send({ ok: true });
  });
}
