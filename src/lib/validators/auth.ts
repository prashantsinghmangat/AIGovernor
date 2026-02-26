import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  teamSize: z.enum(['1-10', '11-50', '51-200', '200+']),
  role: z.enum(['CTO', 'VP Engineering', 'Tech Lead', 'Engineering Manager']),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
