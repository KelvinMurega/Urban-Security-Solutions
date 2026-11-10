import { describe, expect, it } from 'vitest';
import { passwordSchema } from '../src/shared/password';
import { decodeImageDataUrl, parseManagedFileName } from '../src/shared/uploads';
import { distanceMeters } from '../src/shared/geo';
import { parsePage, MAX_PAGE_SIZE } from '../src/shared/pagination';
import { toHttpError, HttpError } from '../src/shared/http-error';
import { PNG_DATA_URL } from './helpers';

describe('password policy', () => {
  it('accepts long passphrases', () => {
    expect(passwordSchema.safeParse('correct horse battery staple').success).toBe(true);
  });
  it.each(['short', 'aaaaaaaaaaaa', '          ', 'x'.repeat(73)])('rejects %j', (value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe('image upload validation', () => {
  it('accepts a real PNG', () => {
    expect(decodeImageDataUrl(PNG_DATA_URL).extension).toBe('png');
  });
  it('rejects HTML disguised as a PNG data URL', () => {
    const fake = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    expect(() => decodeImageDataUrl(fake)).toThrow(/PNG, JPEG, or WEBP/);
  });
  it('rejects SVG and non-image types', () => {
    expect(() => decodeImageDataUrl('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toThrow();
    expect(() => decodeImageDataUrl('data:text/html;base64,PGh0bWw+')).toThrow();
  });
  it('rejects oversized images', () => {
    const big = `data:image/png;base64,${Buffer.alloc(3 * 1024 * 1024).toString('base64')}`;
    expect(() => decodeImageDataUrl(big)).toThrow(/under 2MB/);
  });
});

describe('managed file names', () => {
  it('parses owner ids from our file names', () => {
    expect(parseManagedFileName('0b0f8f3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b-0f0e0d0c.png')?.ownerId).toBe('0b0f8f3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b');
  });
  it.each(['../../.env', '..%2F.env', 'x.png', 'a/b.png', '0b0f8f3e-1c2d-4e5f-8a9b-0c1d2e3f4a5b-1.svg'])('rejects %j', (name) => {
    expect(parseManagedFileName(name)).toBeNull();
  });
});

describe('geo', () => {
  it('computes ~111km per degree of latitude', () => {
    expect(distanceMeters(0, 0, 1, 0)).toBeGreaterThan(110_000);
    expect(distanceMeters(0, 0, 1, 0)).toBeLessThan(112_000);
  });
});

describe('pagination', () => {
  const req = (query: Record<string, string>) => ({ query }) as any;
  it('caps the page size', () => {
    expect(parsePage(req({ limit: '999999' })).take).toBe(MAX_PAGE_SIZE);
  });
  it('ignores garbage values', () => {
    expect(parsePage(req({ limit: 'abc', offset: '-5' }))).toEqual({ take: 500, skip: 0 });
  });
});

describe('error mapping', () => {
  it('never exposes internal error messages', () => {
    const mapped = toHttpError(new Error('ER_ACCESS_DENIED: password for root@db'));
    expect(mapped.status).toBe(500);
    expect(mapped.message).toBe('Internal server error');
  });
  it('keeps safe HttpError messages', () => {
    expect(toHttpError(new HttpError(403, 'Nope')).message).toBe('Nope');
  });
});
