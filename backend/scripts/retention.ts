// Data-retention job (Kenya Data Protection Act 2019: keep personal data no longer than needed).
//
// Strips precise location + device evidence from old shifts (the shift itself, its times and
// hours worked are kept for payroll/billing), and optionally prunes very old audit entries.
//
//   npm run retention            -> dry run: prints what WOULD change, changes nothing
//   npm run retention -- --apply -> performs the changes
//
// Configure with GPS_RETENTION_DAYS (default 365) and AUDIT_RETENTION_DAYS (unset = keep forever).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const days = (name: string, fallback?: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 30) throw new Error(`${name} must be an integer >= 30`);
  return value;
};

const cutoff = (ageDays: number) => new Date(Date.now() - ageDays * 86_400_000);

async function main() {
  const gpsDays = days('GPS_RETENTION_DAYS', 365)!;
  const auditDays = days('AUDIT_RETENTION_DAYS');

  const gpsWhere = {
    startTime: { lt: cutoff(gpsDays) },
    OR: [{ checkInLat: { not: null } }, { checkOutLat: { not: null } }, { checkInIp: { not: null } }, { checkOutIp: { not: null } }],
  };
  const gpsCount = await prisma.shift.count({ where: gpsWhere });
  console.log(`Shifts older than ${gpsDays} days with location/device data: ${gpsCount}`);

  let auditCount = 0;
  if (auditDays) {
    auditCount = await prisma.auditLog.count({ where: { createdAt: { lt: cutoff(auditDays) } } });
    console.log(`Audit entries older than ${auditDays} days: ${auditCount}`);
  } else {
    console.log('AUDIT_RETENTION_DAYS not set: audit log is kept indefinitely.');
  }

  if (!apply) {
    console.log('\nDry run only. Re-run with --apply to make these changes.');
    return;
  }

  const gps = await prisma.shift.updateMany({
    where: gpsWhere,
    data: {
      checkInLat: null,
      checkInLng: null,
      checkOutLat: null,
      checkOutLng: null,
      checkInAccuracyMeters: null,
      checkOutAccuracyMeters: null,
      checkInIp: null,
      checkOutIp: null,
      checkInUserAgent: null,
      checkOutUserAgent: null,
    },
  });
  console.log(`Cleared location/device data on ${gps.count} shifts.`);

  if (auditDays) {
    const removed = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff(auditDays) } } });
    console.log(`Removed ${removed.count} audit entries.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
