import { promises as fs } from 'fs';
import path from 'path';

const DATA_URL_PATTERN = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i;

export const MAX_PHOTOS_PER_SUBMISSION = 4;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB per image

const normalizeExtension = (input: string) => (input.toLowerCase() === 'jpeg' ? 'jpg' : input.toLowerCase());

// Persists a batch of `data:image/...;base64,...` URLs to disk under uploads/<subdir>/
// and returns their public `/uploads/...` paths. Mirrors the avatar upload pattern in
// auth.service.ts so incidents/reports can attach photo evidence without adding multer.
export const persistImageDataUrls = async (
  subdir: string,
  idPrefix: string,
  dataUrls: string[]
): Promise<string[]> => {
  if (dataUrls.length === 0) return [];

  if (dataUrls.length > MAX_PHOTOS_PER_SUBMISSION) {
    throw new Error(`You can attach at most ${MAX_PHOTOS_PER_SUBMISSION} photos.`);
  }

  const directory = path.join(process.cwd(), 'uploads', subdir);
  await fs.mkdir(directory, { recursive: true });

  const urls: string[] = [];
  for (let index = 0; index < dataUrls.length; index += 1) {
    const match = dataUrls[index].match(DATA_URL_PATTERN);
    if (!match) {
      throw new Error('Photos must be PNG, JPEG, or WEBP images.');
    }

    const extension = normalizeExtension(match[1]);
    const buffer = Buffer.from(match[2], 'base64');

    if (buffer.length > MAX_IMAGE_BYTES) {
      throw new Error('Each photo must be under 2MB.');
    }

    const fileName = `${idPrefix}-${index}-${Date.now()}.${extension}`;
    await fs.writeFile(path.join(directory, fileName), buffer);
    urls.push(`/uploads/${subdir}/${fileName}`);
  }

  return urls;
};
