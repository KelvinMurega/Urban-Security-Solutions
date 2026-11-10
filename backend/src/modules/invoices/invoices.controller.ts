import { Request, Response } from 'express';
import { sendError } from '../../shared/http-error';
import { InvoiceStatus, Role } from '@prisma/client';
import { z } from 'zod';
import * as InvoiceService from './invoices.service';

const createInvoiceSchema = z.object({
  clientId: z.string().min(1).max(64),
  siteId: z.string().max(64).optional().nullable(),
  description: z.string().trim().min(3).max(2000),
  amount: z.coerce.number().positive().max(99_999_999.99),
  currency: z.string().regex(/^[A-Z]{3}$/),
  dueDate: z.string().min(1).max(40),
});

const updateInvoiceSchema = z.object({ status: z.nativeEnum(InvoiceStatus) });

export class InvoicesController {
  static async list(req: Request, res: Response) {
    try {
      const actor = (req as any).user as { id: string; role: Role };
      const invoices = actor.role === Role.CLIENT
        ? await InvoiceService.getClientInvoices(actor.id)
        : await InvoiceService.getInvoices();
      res.json(invoices);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async create(req: Request, res: Response) {
    const parsed = createInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      const actor = (req as any).user as { id: string; role: Role };
      const invoice = await InvoiceService.createInvoice({ ...parsed.data, issuedById: actor.id });
      res.status(201).json(invoice);
    } catch (error) {
      sendError(res, error);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const parsed = updateInvoiceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues });

    try {
      const invoice = await InvoiceService.updateInvoiceStatus(String(req.params.id), parsed.data.status);
      res.json(invoice);
    } catch (error) {
      sendError(res, error);
    }
  }
}