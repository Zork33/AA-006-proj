import { hash, compare } from 'bcrypt';
import { db } from '../db/index.js';
import { admins } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, verifyToken, type JwtPayload } from './jwt.js';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function login(email: string, password: string) {
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));
  if (!admin) return null;

  // Корневой суперадмин: password_hash = NULL → первый вход
  if (!admin.passwordHash) {
    return { needPasswordSetup: true, adminId: admin.id, email: admin.email, role: admin.role };
  }

  const valid = await comparePassword(password, admin.passwordHash);
  if (!valid) return null;

  const payload: JwtPayload = { id: admin.id, email: admin.email, role: admin.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}

export async function register(name: string, email: string, password: string) {
  const existing = await db.select().from(admins).where(eq(admins.email, email));
  if (existing.length > 0) return null;

  const passwordHash = await hashPassword(password);
  const [admin] = await db.insert(admins).values({ name, email, passwordHash, role: 'admin' }).returning();

  const payload: JwtPayload = { id: admin.id, email: admin.email, role: admin.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}

export async function refresh(refreshTokenStr: string) {
  const payload = verifyToken(refreshTokenStr);
  const [admin] = await db.select().from(admins).where(eq(admins.id, payload.id));
  if (!admin) return null;

  const newPayload: JwtPayload = { id: admin.id, email: admin.email, role: admin.role };
  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

export async function setupPassword(adminId: number, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await db.update(admins).set({ passwordHash, updatedAt: new Date() }).where(eq(admins.id, adminId));

  const [admin] = await db.select().from(admins).where(eq(admins.id, adminId));
  if (!admin) return null;

  const payload: JwtPayload = { id: admin.id, email: admin.email, role: admin.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}
