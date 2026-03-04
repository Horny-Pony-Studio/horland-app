import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'required').email('invalidEmail'),
  password: z.string().min(1, 'required'),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'required').email('invalidEmail').max(256),
  password: z
    .string()
    .min(8, 'minLength')
    .regex(/[A-Z]/, 'passwordUppercase')
    .regex(/[a-z]/, 'passwordLowercase')
    .regex(/[0-9]/, 'passwordDigit'),
  fullName: z.string().min(2, 'minLength').max(100, 'maxLength'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
