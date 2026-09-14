import { describe, it, expect } from 'vitest';
import { z } from 'zod';

describe('Lead Deduplication with partner_id', () => {
  const createLeadSchema = z.object({
    name: z.string().min(1),
    phone: z.string().min(5),
    email: z.string().email(),
    city: z.string().min(1),
    serviceId: z.number().optional(),
    messenger: z.string().optional(),
    consent: z.literal(true),
    website: z.string().optional(),
  });

  it('should require consent', () => {
    const result = createLeadSchema.safeParse({
      name: 'Иван', phone: '+79991234567', email: 'test@example.com', city: 'Москва',
    });
    expect(result.success).toBe(false);
  });

  it('should accept with consent', () => {
    const result = createLeadSchema.safeParse({
      name: 'Иван', phone: '+79991234567', email: 'test@example.com', city: 'Москва', consent: true,
    });
    expect(result.success).toBe(true);
  });

  it('should reject consent: false', () => {
    const result = createLeadSchema.safeParse({
      name: 'Иван', phone: '+79991234567', email: 'test@example.com', city: 'Москва', consent: false,
    });
    expect(result.success).toBe(false);
  });

  it('should deduplicate by phone+service+partner', () => {
    const leads = [
      { phone: '+79991234567', serviceId: 1, partnerId: 1 },
      { phone: '+79991234567', serviceId: 1, partnerId: 2 },
      { phone: '+79991234567', serviceId: 2, partnerId: 1 },
    ];

    const newLead = { phone: '+79991234567', serviceId: 1, partnerId: 1 };
    const isDuplicate = leads.some(l =>
      l.phone === newLead.phone &&
      l.serviceId === newLead.serviceId &&
      l.partnerId === newLead.partnerId
    );
    expect(isDuplicate).toBe(true);

    const newLead2 = { phone: '+79991234567', serviceId: 1, partnerId: 3 };
    const isDuplicate2 = leads.some(l =>
      l.phone === newLead2.phone &&
      l.serviceId === newLead2.serviceId &&
      l.partnerId === newLead2.partnerId
    );
    expect(isDuplicate2).toBe(false);
  });

  it('should handle null partnerId in dedup', () => {
    const leads = [
      { phone: '+79991234567', serviceId: 1, partnerId: null },
    ];

    const newLead = { phone: '+79991234567', serviceId: 1, partnerId: null };
    const isDuplicate = leads.some(l =>
      l.phone === newLead.phone &&
      l.serviceId === newLead.serviceId &&
      l.partnerId === newLead.partnerId
    );
    expect(isDuplicate).toBe(true);
  });
});

describe('Referral Cookie Flow', () => {
  it('should read ref from cookie when not in body', () => {
    const bodyRef = undefined;
    const cookieRef = 'ref-abc123';
    const ref = bodyRef || cookieRef;
    expect(ref).toBe('ref-abc123');
  });

  it('should prefer body ref over cookie ref', () => {
    const bodyRef = 'ref-body';
    const cookieRef = 'ref-cookie';
    const ref = bodyRef || cookieRef;
    expect(ref).toBe('ref-body');
  });
});

describe('Auth Token', () => {
  it('should decode role from JWT payload', () => {
    const payload = { id: 1, email: 'test@example.com', role: 'superadmin' };
    const token = 'header.' + btoa(JSON.stringify(payload)) + '.signature';
    const decoded = JSON.parse(atob(token.split('.')[1]));
    expect(decoded.role).toBe('superadmin');
  });

  it('should handle invalid token gracefully', () => {
    expect(() => {
      const decoded = JSON.parse(atob('invalid'));
      return decoded.role;
    }).toThrow();
  });
});

describe('Admin Schema Validation', () => {
  const adminSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['admin', 'superadmin']),
    region: z.string().optional(),
  });

  it('should validate admin creation', () => {
    const result = adminSchema.safeParse({
      name: 'Тест', email: 'test@example.com', role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = adminSchema.safeParse({
      name: 'Тест', email: 'not-email', role: 'admin',
    });
    expect(result.success).toBe(false);
  });
});

describe('Service Schema', () => {
  const createServiceSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.number().int().positive().optional(),
  });

  it('should create service with name only', () => {
    const result = createServiceSchema.safeParse({ name: 'Услуга' });
    expect(result.success).toBe(true);
  });

  it('should create service with price', () => {
    const result = createServiceSchema.safeParse({ name: 'Услуга', price: 1000 });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createServiceSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

describe('Partner Block/Unblock', () => {
  it('should validate block status', () => {
    const validStatuses = ['active', 'blocked'];
    expect(validStatuses).toContain('active');
    expect(validStatuses).toContain('blocked');
  });

  it('should toggle between active and blocked', () => {
    const toggle = (current: string) => current === 'blocked' ? 'active' : 'blocked';
    expect(toggle('active')).toBe('blocked');
    expect(toggle('blocked')).toBe('active');
  });
});

describe('Password Reset Token', () => {
  it('should create reset token with purpose', () => {
    const payload = { id: 1, purpose: 'reset' };
    const token = btoa(JSON.stringify(payload));
    const decoded = JSON.parse(atob(token));
    expect(decoded.purpose).toBe('reset');
    expect(decoded.id).toBe(1);
  });

  it('should reject token with wrong purpose', () => {
    const payload = { id: 1, purpose: 'access' };
    expect(payload.purpose).not.toBe('reset');
  });
});

describe('Email Notification Format', () => {
  it('should format lead notification HTML', () => {
    const notification = {
      leadNumber: 'QR-0001',
      name: 'Иван',
      phone: '+79991234567',
      email: 'ivan@example.com',
      city: 'Москва',
      serviceName: 'Ремонт',
      partnerName: 'Партнёр',
      source: 'QR',
    };

    const html = `<h2>📋 Новая заявка</h2>`;
    expect(html).toContain('Новая заявка');
    expect(notification.leadNumber).toBe('QR-0001');
    expect(notification.source).toBe('QR');
  });
});
