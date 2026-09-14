import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, partners } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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

function formatLeadEmail(data: LeadNotification): string {
  return `
    <h2>📋 Новая заявка</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Номер</td><td style="padding: 8px; border: 1px solid #ddd;">${data.leadNumber}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Имя</td><td style="padding: 8px; border: 1px solid #ddd;">${data.name}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Телефон</td><td style="padding: 8px; border: 1px solid #ddd;">${data.phone}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email</td><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Город</td><td style="padding: 8px; border: 1px solid #ddd;">${data.city}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Услуга</td><td style="padding: 8px; border: 1px solid #ddd;">${data.serviceName || '—'}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Партнёр</td><td style="padding: 8px; border: 1px solid #ddd;">${data.partnerName || '—'}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Источник</td><td style="padding: 8px; border: 1px solid #ddd;">${data.source}</td></tr>
      <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Дата</td><td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString('ru-RU')}</td></tr>
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
  const managerEmail = process.env.MANAGER_EMAIL || 'manager@vsyak.zork.ru';

  // В реальном проекте здесь будет nodemailer
  console.log(`[EMAIL] Отправка уведомления на ${managerEmail}:`);
  console.log(`[EMAIL] Тема: Новая заявка ${lead.leadNumber}`);
  console.log(`[EMAIL] Тело: ${JSON.stringify(notification)}`);

  return { sent: true, to: managerEmail };
}

export async function notifyLeadStatusChange(leadId: number, oldStatus: string, newStatus: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return;

  const managerEmail = process.env.MANAGER_EMAIL || 'manager@vsyak.zork.ru';

  console.log(`[EMAIL] Смена статуса заявки ${lead.leadNumber}: ${oldStatus} → ${newStatus}`);
  console.log(`[EMAIL] Отправка на ${managerEmail}`);

  return { sent: true, to: managerEmail };
}
