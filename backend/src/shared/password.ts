import bcrypt from 'bcryptjs';
import { z } from 'zod';

const BCRYPT_COST = 12;

// NIST SP 800-63B style: favour length over composition rules. bcrypt only uses the
// first 72 bytes, so longer passwords are rejected rather than silently truncated.
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 bytes.')
  .refine((value) => value.trim().length > 0, 'Password cannot be blank.')
  .refine((value) => !/^(.)\1+$/.test(value), 'Password cannot be a single repeated character.');

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// Compared against when the account does not exist so that response timing does not
// reveal which emails are registered.
let dummyHash: Promise<string> | null = null;
export const getDummyHash = () => {
  if (!dummyHash) dummyHash = bcrypt.hash('timing-equaliser-not-a-real-password', BCRYPT_COST);
  return dummyHash;
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const emailSchema = z.string().trim().toLowerCase().email('A valid email is required.').max(191);
