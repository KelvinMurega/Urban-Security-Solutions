import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SiteService {
  
  // 1. Create a new Site
  static async createSite(data: { name: string; address: string; contactPhone?: string }) {
    return await prisma.site.create({
      data: {
        name: data.name,
        address: data.address,
        contactPhone: data.contactPhone
      }
    });
  }

  // 2. Get All Sites
  static async getAllSites() {
    return await prisma.site.findMany({
      orderBy: { name: 'asc' } // Sort A-Z
    });
  }

  // 3. Get Single Site with Guards
  static async getSiteById(id: string) {
    return await prisma.site.findUnique({
      where: { id },
      include: { 
        users: true // <--- This grabs the guards!
      }
    });
  }

  // 4. Register a Guard to a Site
  static async addGuardToSite(siteId: string, guardData: any) {
    const hashedPassword = await import('bcryptjs').then(b => b.hash(guardData.password, 10));
    
    return await prisma.user.create({
      data: {
        name: guardData.name,
        email: guardData.email,
        password: hashedPassword,
        role: 'GUARD',
        siteId: siteId // <--- Linking them here
      }
    });
  }

  // Add inside SiteService class
  static async updateSite(id: string, data: any) {
    return await prisma.site.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address,
        contactPhone: data.contactPhone
      }
    });
  }
}