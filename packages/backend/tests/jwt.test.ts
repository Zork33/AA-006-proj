import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyToken } from '../src/lib/jwt.js';

describe('JWT', () => {
  const payload = { id: 1, email: 'test@test.com', role: 'admin' as const };

  it('should sign and verify access token', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('should sign and verify refresh token', () => {
    const token = signRefreshToken(payload);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded.id).toBe(payload.id);
  });

  it('should reject invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });
});
