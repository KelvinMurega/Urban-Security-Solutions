// backend/src/modules/auth/auth.service.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_123'; // Make sure this matches

export class AuthService {

  // 1. Validate User (Check password)
  static async validateUser(email: string, pass: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    // Check if password matches (using bcrypt)
    const isValid = await bcrypt.compare(pass, user.password);
    
    // Fallback: If your database has old plain-text passwords (from early testing)
    // this check handles that so you don't get locked out.
    if (!isValid && pass === user.password) return user; 

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
    return await prisma.user.create({
      data: { ...data, password: hashedPassword }
    });
  }
}