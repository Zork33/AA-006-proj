import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://leads_user:leads_password@localhost:5432/leads_db'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MANAGER_EMAIL: z.string().email().default('manager@vsyak.zork.ru'),
  ROOT_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
