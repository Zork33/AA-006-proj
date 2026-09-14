import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://leads_user:leads_password@localhost:5432/leads_db'),
  JWT_SECRET: z.string().min(16).default('change-me-in-production-at-least-16-chars'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
