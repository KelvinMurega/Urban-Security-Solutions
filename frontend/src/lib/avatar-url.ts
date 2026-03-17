'use client';

export const resolveAvatarUrl = (value: string | null | undefined, apiUrl: string) => {
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${apiUrl}${value}`;
  return `${apiUrl}/${value}`;
};
