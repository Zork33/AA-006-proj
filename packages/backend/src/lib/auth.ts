import { hash, compare } from 'bcrypt';
import { db } from '../db/index.js';
import { admins } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { signAccessToken, signRefreshToken, signResetToken, verifyResetToken, type JwtPayload } from './jwt.js';
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

export async function requestPasswordReset(email: string) {
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));
  if (!admin) return { sent: true };

  const token = signResetToken(admin.id);
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
      to: admin.email,
      subject: 'Сброс пароля — ВСЯК',
      html: `<p>Для сброса пароля перейдите по ссылке: <a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действительна 1 час.</p>`,
    });
  }

  return { sent: true };
}
