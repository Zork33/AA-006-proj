import { hash, compare } from 'bcrypt';
import { db } from '../db/index.js';
import { users, userRoles, userPartners } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, signResetToken, verifyResetToken, verifyToken, type JwtPayload } from './jwt.js';
import nodemailer from 'nodemailer';
import { getEnv } from './env.js';

const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_COST);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return null;

  // Корневой суперадмин: password_hash = NULL → первый вход
  if (!user.passwordHash) {
    return { needPasswordSetup: true, userId: user.id, email: user.email };
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return null;

  // Получаем роль и partnerId
  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
  if (!role) return null;

  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: role.role as JwtPayload['role'],
    partnerId: role.partnerId || undefined,
  };

  // Обновляем last_login_at
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: role.role },
  };
}

export async function register(name: string, email: string, password: string) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) return null;

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({ name, email, passwordHash, status: 'active' }).returning();

  // Создаём роль service_user
  await db.insert(userRoles).values({ userId: user.id, role: 'service_user' });

  const payload: JwtPayload = { id: user.id, email: user.email, role: 'service_user' };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: 'service_user' },
  };
}

export async function refresh(refreshTokenStr: string) {
  let payload: JwtPayload;
  try {
    payload = verifyToken(refreshTokenStr);
  } catch {
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, payload.id));
  if (!user) return null;

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
  if (!role) return null;

  const newPayload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: role.role as JwtPayload['role'],
    partnerId: role.partnerId || undefined,
  };

  return {
    accessToken: signAccessToken(newPayload),
    refreshToken: signRefreshToken(newPayload),
  };
}

export async function setupPassword(userId: string, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;

  const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id));
  if (!role) return null;

  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: role.role as JwtPayload['role'],
    partnerId: role.partnerId || undefined,
  };

  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: role.role },
  };
}

export async function requestPasswordReset(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) return { sent: true };

  const token = signResetToken(user.id);
  const env = getEnv();

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });

    const resetUrl = `${env.CORS_ORIGIN === '*' ? 'http://localhost:3000' : env.CORS_ORIGIN}/admin/reset-password?token=${token}`;
    await transporter.sendMail({
      from: env.SMTP_USER,
      to: user.email,
      subject: 'Сброс пароля — ВСЯК',
      html: `<p>Для сброса пароля перейдите по ссылке: <a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час.</p>`,
    });
  }

  return { sent: true };
}
