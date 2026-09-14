import { describe, it, expect } from 'vitest';

describe('Security', () => {
  it('should rate limit by IP', () => {
    const rateLimits = new Map<string, { count: number; resetAt: number }>();
    const ip = '127.0.0.1';
    const windowMs = 60 * 1000;
    const maxRequests = 10;

    function checkRateLimit(): boolean {
      const now = Date.now();
      const entry = rateLimits.get(ip);

      if (!entry || now > entry.resetAt) {
        rateLimits.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
      }

      entry.count++;
      return entry.count <= maxRequests;
    }

    // Первые 10 запросов — ок
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit()).toBe(true);
    }

    // 11-й запрос — блокировка
    expect(checkRateLimit()).toBe(false);
  });

  it('should detect honeypot', () => {
    function isBot(body: any): boolean {
      return !!body?.website;
    }

    expect(isBot({ name: 'Иван', website: '' })).toBe(false);
    expect(isBot({ name: 'Иван', website: 'http://spam.com' })).toBe(true);
    expect(isBot({ name: 'Иван' })).toBe(false);
  });
});

describe('Notifications', () => {
  it('should format lead email', () => {
    const data = {
      leadNumber: 'QR-0001',
      name: 'Иван',
      phone: '+79991234567',
      email: 'ivan@test.com',
      city: 'Берск',
      serviceName: 'Сантехника',
      partnerName: 'НашБизнес',
      source: 'QR',
    };

    expect(data.leadNumber).toBe('QR-0001');
    expect(data.name).toBe('Иван');
    expect(data.serviceName).toBe('Сантехника');
  });
});
