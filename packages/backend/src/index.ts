import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyCookie } from '@fastify/cookie';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { getEnv } from './lib/env.js';
import { authRoutes } from './routes/auth/index.js';
import { servicesRoutes } from './routes/services/index.js';
import { leadsRoutes } from './routes/leads/index.js';
import { referralRoutes } from './routes/referral/index.js';
import { adminPartnersRoutes } from './routes/admin/partners.js';
import { adminLeadsRoutes } from './routes/admin/leads.js';
import { adminUsersRoutes } from './routes/admin/users.js';
import { adminServicesRoutes } from './routes/admin/services.js';
import { feedbackRoutes } from './routes/feedback/index.js';

const app = Fastify({ logger: true });
const env = getEnv();

await app.register(cors, { origin: !env.CORS_ORIGIN || env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN });
await app.register(fastifyCookie);

await app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: { title: 'ВСЯК API', version: '1.0.0' },
  },
});

await app.register(swaggerUi, {
  routePrefix: '/api/docs',
});

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
await app.register(adminUsersRoutes);
await app.register(adminServicesRoutes);
await app.register(feedbackRoutes);

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

try {
  await app.listen({ port, host });
  app.log.info(`Server running on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
