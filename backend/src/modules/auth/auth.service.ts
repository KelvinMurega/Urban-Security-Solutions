// backend/src/modules/auth/auth.service.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_123'; // Make sure this matches

export class AuthService {

  // 1. Validate User (Check password)
  static async validateUser(email: string, pass: string) {
    const inputEmail = String(email || '').trim();
    const rawPassword = String(pass || '');

    let user = await prisma.user.findUnique({ where: { email: inputEmail } });

    // Fallback for databases where email collation may be case-sensitive.
    if (!user) {
      const users = await prisma.user.findMany();
      user = users.find((u) => u.email.toLowerCase() === inputEmail.toLowerCase()) || null;
    }

    if (!user) return null;

    // Check if password matches (using bcrypt)
    let isValid = await bcrypt.compare(rawPassword, user.password);
    
    // Fallback: If your database has old plain-text passwords (from early testing)
    // this check handles that so you don't get locked out.
    if (!isValid && rawPassword === user.password) return user;

    // Handle accidental spaces pasted into password fields.
    if (!isValid && rawPassword.trim() !== rawPassword) {
      const trimmedPassword = rawPassword.trim();
      isValid = await bcrypt.compare(trimmedPassword, user.password);
      if (!isValid && trimmedPassword === user.password) return user;
    }

    if (!isValid) return null;
    
    return user;
  }

  // 2. Generate Token
  static generateToken(user: any) {
    return jwt.sign(
      { id: user.id, role: user.role }, 
      SECRET_KEY, 
      { expiresIn: '24h' }
    );
  }

  // 3. Register
  static async register(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    return await prisma.user.create({
      data: { ...data, email: normalizedEmail, password: hashedPassword }
    });
  }
}
