export type ClientSite = {
  id: string;
  name: string;
  address: string;
  location?: string | null;
};

export type ClientShift = {
  id: string;
  startTime: string;
  endTime: string | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  status: string;
  workedHours: number;
  user: { id: string; name: string; phone?: string | null };
  site: { id: string; name: string };
};

export type ClientIncident = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reportedAt: string;
  photoUrls?: unknown;
  user: { id: string; name: string };
  site: { id: string; name: string };
};

export type ClientReport = {
  id: string;
  content: string;
  createdAt: string;
  photoUrls?: unknown;
  user: { id: string; name: string };
  shift: {
    id: string;
    startTime: string;
    checkedInAt: string | null;
    checkedOutAt: string | null;
    site: { id: string; name: string };
  };
};

export type ClientInvoice = {
  id: string;
  invoiceNumber: string;
  description: string;
  amount: string;
  currency: string;
  issuedAt: string;
  dueDate: string;
  status: 'ISSUED' | 'PAID' | 'CANCELLED';
  site: { id: string; name: string } | null;
  client?: { id: string; name: string; email: string };
};

export type ClientDashboardData = {
  sites: ClientSite[];
  activeShifts: ClientShift[];
  shifts: ClientShift[];
  incidents: ClientIncident[];
  reports: ClientReport[];
  invoices: ClientInvoice[];
  summary: {
    siteCount: number;
    activeGuards: number;
    hoursThisMonth: number;
    openIncidents: number;
    outstandingByCurrency: { currency: string; amount: number }[];
    outstandingCount: number;
  };
};