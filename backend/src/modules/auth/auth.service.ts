// backend/src/modules/auth/auth.service.ts
import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required in environment variables.');
  }
  return secret;
};

export class AuthService {
  private static readonly avatarDataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i;
  private static readonly avatarDirectory = path.join(process.cwd(), 'uploads', 'avatars');

  private static normalizeAvatarExtension(input: string) {
    const ext = input.toLowerCase();
    if (ext === 'jpeg') return 'jpg';
    return ext;
  }

  private static isManagedAvatarPath(value: string | null | undefined) {
    return Boolean(value && value.startsWith('/uploads/avatars/'));
  }

  private static async deleteManagedAvatar(avatarUrl: string | null | undefined) {
    if (!this.isManagedAvatarPath(avatarUrl)) return;
    const targetPath = path.join(process.cwd(), avatarUrl!.replace(/^\//, ''));
    try {
      await fs.unlink(targetPath);
    } catch {
      // Ignore missing/locked old files; this should not block profile updates.
    }
  }

  private static async persistAvatarDataUrl(userId: string, dataUrl: string) {
    const match = dataUrl.match(this.avatarDataUrlPattern);
    if (!match) return null;

    const extension = this.normalizeAvatarExtension(match[1]);
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');

    // Guardrail against oversized payloads even if frontend validation is bypassed.
    if (buffer.length > 2 * 1024 * 1024) {
      throw new Error('Avatar file is too large.');
    }

    await fs.mkdir(this.avatarDirectory, { recursive: true });
    const fileName = `${userId}-${Date.now()}.${extension}`;
    const filePath = path.join(this.avatarDirectory, fileName);
    await fs.writeFile(filePath, buffer);
    return `/uploads/avatars/${fileName}`;
  }

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
      getJwtSecret(),
      { expiresIn: '24h' }
    );
  }

  // 3. Register
  static async register(data: any) {
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      throw new Error('Public registration is disabled after initial setup.');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const normalizedEmail = String(data.email || '').trim().toLowerCase();
    return await prisma.user.create({
      data: {
        ...data,
        email: normalizedEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        siteId: null
      }
    });
  }

  static async getProfile(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        site: {
          select: { id: true, name: true }
        }
      }
    });
  }

  static async updateProfile(userId: string, data: { name?: string; phone?: string; password?: string; avatarUrl?: string }) {
    const updateData: { name?: string; phone?: string; password?: string; avatarUrl?: string | null } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
    }
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.avatarUrl !== undefined) {
      const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      const incoming = String(data.avatarUrl || '').trim();
      if (!incoming) {
        updateData.avatarUrl = null;
        await this.deleteManagedAvatar(existing?.avatarUrl);
      } else if (incoming.startsWith('data:image/')) {
        const persisted = await this.persistAvatarDataUrl(userId, incoming);
        if (!persisted) {
          throw new Error('Invalid avatar image format.');
        }
        updateData.avatarUrl = persisted;
        await this.deleteManagedAvatar(existing?.avatarUrl);
      } else {
        updateData.avatarUrl = incoming;
      }
    }

    return await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        site: {
          select: { id: true, name: true }
        }
      }
    });
  }

  static async getGuardDirectory() {
    return await prisma.user.findMany({
      where: {
        role: Role.GUARD,
        status: UserStatus.ACTIVE
      },
      select: {
        id: true,
        name: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });
  }
}
