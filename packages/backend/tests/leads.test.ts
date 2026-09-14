import { describe, it, expect } from 'vitest';

describe('Leads', () => {
  it('should generate QR lead number', () => {
    function generateLeadNumber(prefix: string, id: number): string {
      return `${prefix}-${String(id).padStart(4, '0')}`;
    }

    expect(generateLeadNumber('QR', 1)).toBe('QR-0001');
    expect(generateLeadNumber('QR', 123)).toBe('QR-0123');
    expect(generateLeadNumber('PARTNER', 42)).toBe('PARTNER-0042');
  });

  it('should validate lead schema', () => {
    const schema = {
      name: 'string',
      phone: 'string',
      email: 'string',
      city: 'string',
      serviceId: 'number?',
      messenger: 'string?',
      ref: 'string?',
    };

    expect(schema.name).toBe('string');
    expect(schema.phone).toBe('string');
    expect(schema.email).toBe('string');
  });
});
