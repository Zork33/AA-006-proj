import jwt from 'jsonwebtoken';
import { getEnv } from '../lib/env.js';

export interface JwtPayload {
  id: number;
  email: string;
  role: 'superadmin' | 'admin';
}

export function signAccessToken(payload: JwtPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload): string {
  const env = getEnv();
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });
}

export function signResetToken(adminId: number): string {
  const env = getEnv();
  return jwt.sign({ id: adminId, purpose: 'reset' }, env.JWT_SECRET, { expiresIn: '1h' });
}

export function verifyResetToken(token: string): { id: number } {
  const env = getEnv();
  const decoded = jwt.verify(token, env.JWT_SECRET) as { id: number; purpose: string };
  if (decoded.purpose !== 'reset') throw new Error('Invalid token purpose');
  return { id: decoded.id };
}

export function verifyToken(token: string): JwtPayload {
  const env = getEnv();
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
