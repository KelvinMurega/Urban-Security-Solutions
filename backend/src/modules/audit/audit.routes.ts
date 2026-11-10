import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma';
import { sendError } from '../../shared/http-error';
import { parsePage, sendPage } from '../../shared/pagination';

// Read-only view of the audit trail (mounted behind requireRole(ADMIN)). There is
// intentionally no endpoint to modify or delete audit entries.
const router = Router();

const filterSchema = z.object({
  entityType: z.enum(['user', 'client', 'site', 'shift', 'incident', 'report', 'invoice', 'auth']).optional(),
  entityId: z.string().max(64).optional(),
  actorId: z.string().max(64).optional(),
  action: z.string().max(64).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = filterSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });
    const { entityType, entityId, actorId, action, from, to } = parsed.data;

    const where = {
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(actorId && { actorId }),
      ...(action && { action }),
      ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }),
    };

    const page = parsePage(req, 100);
    sendPage(
      res,
      await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: { actor: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          ...page,
        }),
        prisma.auditLog.count({ where }),
      ])
    );
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
