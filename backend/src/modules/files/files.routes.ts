import { Request, Response, Router } from 'express';
import path from 'path';
import { Role } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../shared/prisma';
import { securityLog } from '../../shared/security-log';
import { parseManagedFileName, UPLOAD_CATEGORIES, UPLOAD_ROOT, UploadCategory } from '../../shared/uploads';

const router = Router();

const photoListIncludes = (photoUrls: unknown, url: string) => Array.isArray(photoUrls) && photoUrls.includes(url);

const clientCanSeeSite = async (clientId: string, siteId: string) =>
  Boolean(await prisma.clientSite.findUnique({ where: { clientId_siteId: { clientId, siteId } }, select: { siteId: true } }));

// Decides whether `user` may read a given evidence/avatar file. Deny by default.
const canReadFile = async (user: { id: string; role: Role }, category: UploadCategory, ownerId: string, url: string) => {
  if (category === 'avatars') return true; // any signed-in user sees profile pictures

  if (category === 'incidents') {
    const incident = await prisma.incident.findUnique({
      where: { id: ownerId },
      select: { userId: true, siteId: true, photoUrls: true },
    });
    if (!incident || !photoListIncludes(incident.photoUrls, url)) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.GUARD) return incident.userId === user.id;
    if (user.role === Role.CLIENT) return clientCanSeeSite(user.id, incident.siteId);
    return false;
  }

  if (category === 'reports') {
    const report = await prisma.report.findUnique({
      where: { id: ownerId },
      select: { userId: true, photoUrls: true, shift: { select: { siteId: true } } },
    });
    if (!report || !photoListIncludes(report.photoUrls, url)) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.GUARD) return report.userId === user.id;
    if (user.role === Role.CLIENT) return clientCanSeeSite(user.id, report.shift.siteId);
    return false;
  }

  return false;
};

// Uploaded files are never served statically: every request is authenticated and authorized
// against the record the file belongs to.
router.get('/:category/:fileName', requireAuth, async (req: Request, res: Response) => {
  const category = String(req.params.category) as UploadCategory;
  const fileName = String(req.params.fileName);
  const parsed = parseManagedFileName(fileName);

  if (!UPLOAD_CATEGORIES.includes(category) || !parsed) {
    return res.status(404).json({ error: 'Not found' });
  }

  const url = `/uploads/${category}/${fileName}`;
  const user = req.user!;

  try {
    if (!(await canReadFile(user, category, parsed.ownerId, url))) {
      securityLog('access.denied', { userId: user.id, role: user.role, path: url });
      // 404 rather than 403 so callers cannot probe which files exist.
      return res.status(404).json({ error: 'Not found' });
    }

    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(fileName, { root: path.join(UPLOAD_ROOT, category), dotfiles: 'deny' }, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Not found' });
    });
  } catch (error) {
    console.error('[files] failed to serve upload', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
