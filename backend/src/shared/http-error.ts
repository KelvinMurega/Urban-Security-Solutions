import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from './logger';
import { captureException } from './monitoring';

// Errors whose message is safe to show to the caller. Anything else is treated as an
// internal error and replaced with a generic message, so database/stack details never leak.
export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export const toHttpError = (error: unknown): HttpError => {
  if (error instanceof HttpError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2025':
        return notFound('Record not found.');
      case 'P2002':
        return conflict('A record with these details already exists.');
      case 'P2003':
        return badRequest('A related record does not exist.');
      case 'P2000':
        return badRequest('One of the values is too long.');
      default:
        break;
    }
  }

  // body-parser errors (oversized / malformed JSON) carry a safe status + type
  const maybe = error as { status?: number; type?: string };
  if (maybe?.type === 'entity.too.large') return new HttpError(413, 'Request body is too large.');
  if (maybe?.type === 'entity.parse.failed') return badRequest('Malformed JSON body.');

  return new HttpError(500, 'Internal server error');
};

export const sendError = (res: Response, error: unknown) => {
  const httpError = toHttpError(error);
  if (httpError.status >= 500) {
    logger.error({ err: error }, 'unhandled error');
    captureException(error);
  }
  return res.status(httpError.status).json({ error: httpError.message });
};
