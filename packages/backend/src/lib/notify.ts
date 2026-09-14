import nodemailer from 'nodemailer';
import { db } from '../db/index.js';
import { leads, services, partners } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getEnv } from './env.js';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface LeadNotification {
  leadNumber: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  serviceName?: string;
  partnerName?: string;
  source: string;
}

function getTransporter() {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
}

function formatLeadEmail(data: LeadNotification): string {
  return `
    <h2>📋 Новая заявка</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Номер</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.leadNumber)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Имя</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Телефон</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.phone)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Город</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.city)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Услуга</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.serviceName || '—')}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Партнёр</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.partnerName || '—')}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Источник</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(data.source)}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Дата</td><td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(new Date().toLocaleString('ru-RU'))}</td></tr>
    </table>
  `;
}

export async function notifyNewLead(leadId: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return;

  const [service] = lead.serviceId
    ? await db.select().from(services).where(eq(services.id, lead.serviceId))
    : [null];

  const [partner] = lead.partnerId
    ? await db.select().from(partners).where(eq(partners.id, lead.partnerId))
    : [null];

  const notification: LeadNotification = {
    leadNumber: lead.leadNumber,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    serviceName: service?.name,
    partnerName: partner?.name,
    source: lead.source,
  };

  const html = formatLeadEmail(notification);
  const env = getEnv();
  const managerEmail = env.MANAGER_EMAIL;

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] SMTP не настроен. Уведомление для ${lead.leadNumber}:`);
    console.log(`[EMAIL] → ${managerEmail}`);
    return { sent: false, to: managerEmail, reason: 'SMTP not configured' };
  }

  await transporter.sendMail({
    from: env.SMTP_USER,
    to: managerEmail,
    subject: `Новая заявка ${lead.leadNumber}`,
    html,
  });

  return { sent: true, to: managerEmail };
}

export async function notifyLeadStatusChange(leadId: number, oldStatus: string, newStatus: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return;

  const env = getEnv();
  const managerEmail = env.MANAGER_EMAIL;

  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[EMAIL] SMTP не настроен. Смена статуса ${lead.leadNumber}: ${oldStatus} → ${newStatus}`);
    return { sent: false, to: managerEmail, reason: 'SMTP not configured' };
  }

  await transporter.sendMail({
    from: env.SMTP_USER,
    to: managerEmail,
    subject: `Заявка ${lead.leadNumber}: ${oldStatus} → ${newStatus}`,
    html: `<p>Заявка <b>${escapeHtml(lead.leadNumber)}</b>: статус изменён с <b>${escapeHtml(oldStatus)}</b> на <b>${escapeHtml(newStatus)}</b></p>`,
  });

  return { sent: true, to: managerEmail };
}
