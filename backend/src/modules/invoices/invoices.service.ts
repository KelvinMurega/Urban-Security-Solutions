import { InvoiceStatus, PrismaClient, Role } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

const invoiceInclude = {
  client: { select: { id: true, name: true, email: true } },
  site: { select: { id: true, name: true } },
  issuedBy: { select: { id: true, name: true } },
};

const serializeInvoice = (invoice: any) => ({
  ...invoice,
  amount: invoice.amount.toString(),
});

export const getInvoices = async () => {
  const invoices = await prisma.invoice.findMany({
    include: invoiceInclude,
    orderBy: { issuedAt: 'desc' },
  });
  return invoices.map(serializeInvoice);
};

export const getClientInvoices = async (clientId: string) => {
  const invoices = await prisma.invoice.findMany({
    where: { clientId },
    include: invoiceInclude,
    orderBy: { issuedAt: 'desc' },
  });
  return invoices.map(serializeInvoice);
};

export const createInvoice = async (data: {
  clientId: string;
  siteId?: string | null;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  issuedById: string;
}) => {
  const client = await prisma.user.findUnique({
    where: { id: data.clientId },
    select: { id: true, role: true },
  });
  if (!client || client.role !== Role.CLIENT) throw new Error('Client not found.');

  const dueDate = new Date(data.dueDate);
  if (Number.isNaN(dueDate.getTime())) throw new Error('A valid due date is required.');

  if (data.siteId) {
    const assignment = await prisma.clientSite.findUnique({
      where: { clientId_siteId: { clientId: data.clientId, siteId: data.siteId } },
      select: { clientId: true },
    });
    if (!assignment) throw new Error('The selected site is not assigned to this client.');
  }

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber: `USS-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
      clientId: data.clientId,
      siteId: data.siteId || null,
      description: data.description.trim(),
      amount: data.amount,
      currency: data.currency,
      dueDate,
      issuedById: data.issuedById,
      status: InvoiceStatus.ISSUED,
    },
    include: invoiceInclude,
  });
  return serializeInvoice(invoice);
};

export const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status },
    include: invoiceInclude,
  });
  return serializeInvoice(invoice);
};