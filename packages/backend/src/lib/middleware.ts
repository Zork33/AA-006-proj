import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, type JwtPayload } from './jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  // Try cookie first, then Authorization header
  const token = request.cookies?.access_token || 
    (request.headers.authorization?.startsWith('Bearer ') 
      ? request.headers.authorization.slice(7) 
      : null);

  if (!token) {
    return reply.status(401).send({ error: 'Требуется авторизация' });
  }

  try {
    request.user = verifyToken(token);
  } catch {
    return reply.status(401).send({ error: 'Невалидный токен' });
  }
}

export async function requireSuperadmin(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;

  if (request.user?.role !== 'superadmin') {
    return reply.status(403).send({ error: 'Доступ запрещён' });
  }
}
