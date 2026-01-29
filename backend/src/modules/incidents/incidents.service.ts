import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class IncidentService {
  
  // 1. Log a new Incident
  static async createIncident(data: any) {
    return await prisma.incident.create({
      data: {
        title: data.title,
        description: data.description,
        severity: data.severity,
        userId: data.userId,
        siteId: data.siteId,
        status: 'OPEN'
      }
    });
  }

  // 2. Get All Incidents (Newest first)
  static async getAllIncidents() {
    return await prisma.incident.findMany({
      include: {
        user: { select: { name: true } }, // Who reported it?
        site: { select: { name: true } }  // Where?
      },
      orderBy: { reportedAt: 'desc' }
    });
  }

  // 3. Update Incident 
  static async updateIncident(id: string, data: any) { 
    return await prisma.incident.update({
      where: { id },
      data: {
        status: data.status,
        resolutionDetails: data.resolutionDetails, 
        resolvedAt: data.status === 'RESOLVED' ? new Date() : null
      }
    }); 
  }
}