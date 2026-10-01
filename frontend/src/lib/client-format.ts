export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

export const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not set'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
};

export const formatHours = (hours: number) => `${Number(hours || 0).toFixed(2)} hrs`;

export const formatMoney = (amount: number | string, currency: string) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

export const invoiceState = (invoice: { status: string; dueDate: string }) => {
  if (invoice.status === 'ISSUED' && new Date(invoice.dueDate).getTime() < Date.now()) return 'OVERDUE';
  return invoice.status;
};