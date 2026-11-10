'use client';

// Only inline images and files served by our own API are rendered; external URLs are ignored
// (the API no longer accepts them, and they would allow tracking pixels / mixed content).
export const resolveAvatarUrl = (value: string | null | undefined, apiUrl: string) => {
  if (!value) return '';
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('/uploads/')) return `${apiUrl}${value}`;
  return '';
};
