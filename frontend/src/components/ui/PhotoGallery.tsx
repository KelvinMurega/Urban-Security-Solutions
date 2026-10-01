'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { resolveAvatarUrl as resolveAssetUrl } from '../../lib/avatar-url';
import { resolveApiUrl } from '../../lib/api-url';

export default function PhotoGallery({ urls }: { urls?: unknown }) {
  const apiUrl = resolveApiUrl();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const list = Array.isArray(urls) ? (urls as string[]) : [];
  if (list.length === 0) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map((url, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="h-16 w-16 overflow-hidden rounded-lg border border-gray-200 transition hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolveAssetUrl(url, apiUrl)} alt={`Evidence ${index + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpenIndex(null)}
        >
          <button
            type="button"
            onClick={() => setOpenIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveAssetUrl(list[openIndex], apiUrl)}
            alt={`Evidence ${openIndex + 1}`}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {list.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {list.map((_, dot) => (
                <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === openIndex ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
