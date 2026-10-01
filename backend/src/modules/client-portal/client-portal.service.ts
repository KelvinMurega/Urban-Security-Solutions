import { IncidentStatus, InvoiceStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const workedHours = (checkedInAt: Date | null, checkedOutAt: Date | null, now: Date) => {
  if (!checkedInAt) return 0;
  const end = checkedOutAt ?? now;
  return end >= checkedInAt
    ? Number(((end.getTime() - checkedInAt.getTime()) / 3_600_000).toFixed(2))
    : 0;
};

const serializeInvoice = (invoice: any) => ({
  ...invoice,
  amount: invoice.amount.toString(),
});

export const getDashboard = async (clientId: string) => {
  const assignments = await prisma.clientSite.findMany({
    where: { clientId },
    include: {
      site: { select: { id: true, name: true, address: true, location: true } },
    },
    orderBy: { assignedAt: 'asc' },
  });
  const sites = assignments.map(({ site }) => site);
  const siteIds = sites.map(({ id }) => id);
  if (siteIds.length === 0) {
    return {
      sites,
      activeShifts: [],
      shifts: [],
      incidents: [],
      reports: [],
      invoices: [],
      summary: { siteCount: 0, activeGuards: 0, hoursThisMonth: 0, openIncidents: 0, outstandingByCurrency: [], outstandingCount: 0 },
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [activeShifts, shifts, monthlyShifts, incidents, reports, invoices, openIncidents] = await Promise.all([
    prisma.shift.findMany({
      where: { siteId: { in: siteIds }, checkedInAt: { not: null }, checkedOutAt: null },
      include: { user: { select: { id: true, name: true, phone: true } }, site: { select: { id: true, name: true } } },
      orderBy: { checkedInAt: 'desc' },
    }),
    prisma.shift.findMany({
      where: { siteId: { in: siteIds } },
      include: { user: { select: { id: true, name: true } }, site: { select: { id: true, name: true } } },
      orderBy: { startTime: 'desc' },
      take: 40,
    }),
    prisma.shift.findMany({
      where: { siteId: { in: siteIds }, checkedInAt: { gte: monthStart, lt: nextMonthStart } },
      select: { checkedInAt: true, checkedOutAt: true },
    }),
    prisma.incident.findMany({
      where: { siteId: { in: siteIds } },
      include: { user: { select: { id: true, name: true } }, site: { select: { id: true, name: true } } },
      orderBy: { reportedAt: 'desc' },
      take: 30,
    }),
    prisma.report.findMany({
      where: { shift: { siteId: { in: siteIds } } },
      include: {
        user: { select: { id: true, name: true } },
        shift: { select: { id: true, startTime: true, checkedInAt: true, checkedOutAt: true, site: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.invoice.findMany({
      where: { clientId },
      include: { site: { select: { id: true, name: true } } },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    }),
    prisma.incident.count({ where: { siteId: { in: siteIds }, status: IncidentStatus.OPEN } }),
  ]);

  const outstandingInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.ISSUED);
  const outstandingByCurrency = [...outstandingInvoices.reduce((totals, invoice) => {
    totals.set(invoice.currency, (totals.get(invoice.currency) || 0) + Number(invoice.amount));
    return totals;
  }, new Map<string, number>())].map(([currency, amount]) => ({ currency, amount: Number(amount.toFixed(2)) }));
  const summary = {
    siteCount: sites.length,
    activeGuards: activeShifts.length,
    hoursThisMonth: Number(monthlyShifts.reduce((total, shift) => total + workedHours(shift.checkedInAt, shift.checkedOutAt, now), 0).toFixed(2)),
    openIncidents,
    outstandingByCurrency,
    outstandingCount: outstandingInvoices.length,
  };

  return {
    sites,
    activeShifts: activeShifts.map((shift) => ({ ...shift, workedHours: workedHours(shift.checkedInAt, shift.checkedOutAt, now) })),
    shifts: shifts.map((shift) => ({ ...shift, workedHours: workedHours(shift.checkedInAt, shift.checkedOutAt, now) })),
    incidents,
    reports,
    invoices: invoices.map(serializeInvoice),
    summary,
  };
};