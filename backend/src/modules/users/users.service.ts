// backend/src/modules/users/users.service.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class UserService {

  // 1. Create a new Guard (Standard registration)
  static async createGuard(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        role: 'GUARD',
      },
    });
  }

  // 2. Get All Guards
  static async findAllGuards() {
    return await prisma.user.findMany({
      where: { role: 'GUARD' },
      include: { site: true },
    });
  }

  // 3. Get Single Guard with History (Profile View)
  static async getGuardById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        site: true, // Current assigned site
        shifts: {
          orderBy: { startTime: 'desc' },
          take: 5, // Last 5 shifts
          include: { site: true }
        },
        incidents: {
          orderBy: { reportedAt: 'desc' },
          take: 5 // Last 5 incidents reported
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 daily logs
        }
      }
    });
  }

  // 4. Update User (The new feature for changing passwords)
  static async updateUser(id: string, data: any) {
    // If a password is provided, encrypt it before saving
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data,
    });
  }
}