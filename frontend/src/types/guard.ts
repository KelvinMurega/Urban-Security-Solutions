// Shared Guard type for frontend
export type Guard = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
  siteId?: string;
  site?: { name: string };
  shifts?: any[];
  incidents?: any[];
};
