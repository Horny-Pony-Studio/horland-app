import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '@/lib/validators/auth';

describe('loginSchema', () => {
  it('accepts valid login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('rejects password without uppercase', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'password1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without lowercase', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'PASSWORD1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without digit', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Passwordd',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Pa1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short fullName', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      fullName: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('rejects too long fullName', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      fullName: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts fullName at max length boundary', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      fullName: 'A'.repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it('rejects too long email', () => {
    const result = registerSchema.safeParse({
      email: 'a'.repeat(251) + '@x.com',
      password: 'Password1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = registerSchema.safeParse({
      email: '',
      password: 'Password1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format in register', () => {
    const result = registerSchema.safeParse({
      email: 'notanemail',
      password: 'Password1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password at min length boundary (8 chars)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Abcdefg1',
      fullName: 'Test User',
    });
    expect(result.success).toBe(true);
  });

  it('accepts fullName at min length boundary (2 chars)', () => {
    const result = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'Password1',
      fullName: 'AB',
    });
    expect(result.success).toBe(true);
  });
});
