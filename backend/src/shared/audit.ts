import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

export type AuditEntity = 'user' | 'client' | 'site' | 'shift' | 'incident' | 'report' | 'invoice' | 'auth';

type AuditEntry = {
  action: string;
  entityType: AuditEntity;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  actorId?: string | null;
};

// Append-only audit trail. Called after a change has succeeded. A failure to write the
// audit row is logged loudly but does not undo the business action.
export const recordAudit = async (req: Request | null, entry: AuditEntry) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId !== undefined ? entry.actorId : req?.user?.id ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: entry.metadata,
        ip: req?.ip?.slice(0, 45) ?? null,
      },
    });
  } catch (error) {
    logger.error({ err: error, audit: { action: entry.action, entityType: entry.entityType, entityId: entry.entityId } }, 'failed to write audit log');
  }
};
