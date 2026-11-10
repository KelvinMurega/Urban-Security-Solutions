import { Request, Response } from 'express';

export type Page = { take: number; skip: number };

export const DEFAULT_PAGE_SIZE = 500;
export const MAX_PAGE_SIZE = 1000;

// Every list endpoint is bounded: `?limit=&offset=` with a hard maximum, so no request can
// pull an unbounded table. The body stays a plain array (backwards compatible); the total
// is exposed in the X-Total-Count header for paging UIs.
export const parsePage = (req: Request, defaultLimit = DEFAULT_PAGE_SIZE): Page => {
  const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
  const offset = Number.parseInt(String(req.query.offset ?? ''), 10);
  return {
    take: Number.isFinite(limit) && limit > 0 ? Math.min(limit, MAX_PAGE_SIZE) : Math.min(defaultLimit, MAX_PAGE_SIZE),
    skip: Number.isFinite(offset) && offset > 0 ? Math.min(offset, 1_000_000) : 0,
  };
};

export const sendPage = <T>(res: Response, [items, total]: [T[], number]) => {
  res.setHeader('X-Total-Count', String(total));
  return res.json(items);
};
