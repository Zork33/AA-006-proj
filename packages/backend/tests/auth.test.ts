import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { hashPassword, comparePassword } from '../src/lib/auth.js';

describe('Auth', () => {
  it('should hash and compare password', async () => {
    const password = 'test123456';
    const hashed = await hashPassword(password);

    expect(hashed).not.toBe(password);
    expect(hashed).toMatch(/^\$2[aby]?\$/);

    const isValid = await comparePassword(password, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await comparePassword('wrong', hashed);
    expect(isInvalid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const hash1 = await hashPassword('test123456');
    const hash2 = await hashPassword('test123456');
    expect(hash1).not.toBe(hash2);
  });
});
