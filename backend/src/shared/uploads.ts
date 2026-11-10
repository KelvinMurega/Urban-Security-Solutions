import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { badRequest } from './http-error';

const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/]+={0,2})$/i;

export const MAX_PHOTOS_PER_SUBMISSION = 4;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB per image

export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
export const UPLOAD_CATEGORIES = ['avatars', 'incidents', 'reports'] as const;
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

type ImageType = 'png' | 'jpg' | 'webp';

// Identify the image by its actual bytes, not the client-declared MIME type, so a
// renamed HTML/SVG/executable payload can never be stored and served as an "image".
const sniffImageType = (buffer: Buffer): ImageType | null => {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
};

// Decodes and validates a `data:image/...;base64,...` URL. Throws a user-facing error.
export const decodeImageDataUrl = (dataUrl: string) => {
  if (typeof dataUrl !== 'string' || dataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 1.4) + 64) {
    throw badRequest(`Each photo must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`);
  }
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) throw badRequest('Photos must be PNG, JPEG, or WEBP images.');

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0) throw badRequest('Photo is empty.');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest(`Each photo must be under ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`);

  const type = sniffImageType(buffer);
  if (!type) throw badRequest('Photos must be PNG, JPEG, or WEBP images.');

  return { buffer, extension: type };
};

// Stored file names are `<ownerId>-<random uuid>.<ext>`: the owner id lets the file route
// authorize access; the random part makes URLs unguessable.
const writeImage = async (category: UploadCategory, ownerId: string, buffer: Buffer, extension: ImageType) => {
  const directory = path.join(UPLOAD_ROOT, category);
  await fs.mkdir(directory, { recursive: true });
  const fileName = `${ownerId}-${randomUUID()}.${extension}`;
  await fs.writeFile(path.join(directory, fileName), buffer, { flag: 'wx' });
  return `/uploads/${category}/${fileName}`;
};

export const persistImageDataUrls = async (
  category: Exclude<UploadCategory, 'avatars'>,
  ownerId: string,
  dataUrls: string[]
): Promise<string[]> => {
  if (dataUrls.length === 0) return [];
  if (dataUrls.length > MAX_PHOTOS_PER_SUBMISSION) {
    throw badRequest(`You can attach at most ${MAX_PHOTOS_PER_SUBMISSION} photos.`);
  }

  // Validate everything before writing anything, so a bad 3rd photo leaves no orphans.
  const decoded = dataUrls.map(decodeImageDataUrl);
  return Promise.all(decoded.map(({ buffer, extension }) => writeImage(category, ownerId, buffer, extension)));
};

export const persistAvatar = async (userId: string, dataUrl: string) => {
  const { buffer, extension } = decodeImageDataUrl(dataUrl);
  return writeImage('avatars', userId, buffer, extension);
};

const MANAGED_FILE_NAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-[A-Za-z0-9-]+\.(png|jpe?g|webp)$/i;

// Parses a stored file name, rejecting anything that is not one of ours (path traversal etc.).
export const parseManagedFileName = (fileName: string) => {
  const match = MANAGED_FILE_NAME.exec(fileName);
  return match ? { ownerId: match[1].toLowerCase() } : null;
};

export const isManagedUploadPath = (value: string | null | undefined, category: UploadCategory) => {
  if (!value) return false;
  const prefix = `/uploads/${category}/`;
  return value.startsWith(prefix) && parseManagedFileName(value.slice(prefix.length)) !== null;
};

export const deleteManagedUpload = async (value: string | null | undefined, category: UploadCategory) => {
  if (!value || !isManagedUploadPath(value, category)) return;
  const fileName = value.slice(`/uploads/${category}/`.length);
  try {
    await fs.unlink(path.join(UPLOAD_ROOT, category, fileName));
  } catch {
    // Missing/locked old files must not block the update.
  }
};
