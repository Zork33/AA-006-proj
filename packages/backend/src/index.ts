import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyCookie } from '@fastify/cookie';
import { authRoutes } from './routes/auth/index.js';
import { servicesRoutes } from './routes/services/index.js';
import { leadsRoutes } from './routes/leads/index.js';
import { referralRoutes } from './routes/referral/index.js';
import { adminPartnersRoutes } from './routes/admin/partners.js';
import { adminLeadsRoutes } from './routes/admin/leads.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(fastifyCookie);

app.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

await app.register(authRoutes);
await app.register(servicesRoutes);
await app.register(leadsRoutes);
await app.register(referralRoutes);
await app.register(adminPartnersRoutes);
await app.register(adminLeadsRoutes);

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
