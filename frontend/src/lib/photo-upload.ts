'use client';

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB, mirrors the backend cap

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Failed to read file.')));
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

// Validates and converts newly-selected files into base64 data URLs, given how many
// photos are already attached. Throws a user-facing message on the first violation.
export const filesToDataUrls = async (files: File[], existingCount: number): Promise<string[]> => {
  if (existingCount + files.length > MAX_PHOTOS) {
    throw new Error(`You can attach at most ${MAX_PHOTOS} photos.`);
  }

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed.');
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error('Each photo must be under 2MB.');
    }
  }

  return Promise.all(files.map(readFileAsDataUrl));
};
