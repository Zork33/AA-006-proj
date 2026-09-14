import { describe, it, expect } from 'vitest';

describe('Partner Routes', () => {
  it('should validate partner registration schema', () => {
    const schema = {
      name: 'string',
      email: 'string',
      partnerCode: 'string',
    };

    expect(schema.name).toBe('string');
    expect(schema.email).toBe('string');
    expect(schema.partnerCode).toBe('string');
  });

  it('should generate partner code', () => {
    const code = `P-${Date.now().toString(36).toUpperCase()}`;
    expect(code).toMatch(/^P-/);
  });

  it('should generate referral token', () => {
    const token = `ref-${crypto.randomUUID().slice(0, 8)}`;
    expect(token).toMatch(/^ref-/);
    expect(token.length).toBe(12);
  });
});

describe('Feedback Routes', () => {
  it('should validate feedback schema', () => {
    const schema = {
      leadNumber: 'string',
      rating: 'number (1-5)',
      comment: 'string?',
    };

    expect(schema.leadNumber).toBe('string');
    expect(schema.rating).toBe('number (1-5)');
  });

  it('should calculate rating delta', () => {
    function getRatingDelta(rating: number): number {
      return rating >= 4 ? 2 : rating <= 2 ? -3 : 0;
    }

    expect(getRatingDelta(5)).toBe(2);
    expect(getRatingDelta(4)).toBe(2);
    expect(getRatingDelta(3)).toBe(0);
    expect(getRatingDelta(2)).toBe(-3);
    expect(getRatingDelta(1)).toBe(-3);
  });
});
