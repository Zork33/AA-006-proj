import jwt from 'jsonwebtoken';
import { getEnv } from '../lib/env.js';

export interface JwtPayload {
  id: string;  // UUID
  email: string;
  role: 'super_admin' | 'partner_admin' | 'service_user';
  partnerId?: string;  // UUID партнёра (если role = partner_admin)
}

export function signAccessToken(payload: JwtPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}

export function signResetToken(userId: string): string {
  const env = getEnv();
  return jwt.sign({ id: userId, purpose: 'reset' }, env.JWT_SECRET, { expiresIn: '1h' });
}

export function verifyResetToken(token: string): { id: string } {
  const env = getEnv();
  const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; purpose: string };
  if (decoded.purpose !== 'reset') throw new Error('Invalid token purpose');
  return { id: decoded.id };
}

export function verifyToken(token: string): JwtPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
