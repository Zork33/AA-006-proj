import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateLimitEntry>();

export async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const ip = request.ip || request.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 минута
  const maxRequests = 10;

  const entry = rateLimits.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return reply.status(429).send({ error: 'Слишком много запросов. Попробуйте позже.' });
  }
}

export async function honeypotCheck(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as any;
  if (body?.website) {
    // Honeypot заполнен — это бот
    return reply.status(200).send({ success: true });
  }
}
