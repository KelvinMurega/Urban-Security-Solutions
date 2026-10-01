'use client';

import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { filesToDataUrls, MAX_PHOTOS } from '../../lib/photo-upload';
import { useToast } from './ToastProvider';

export default function PhotoPicker({
  value,
  onChange,
  label = 'Add Photos',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    try {
      const dataUrls = await filesToDataUrls(Array.from(fileList), value.length);
      onChange([...value, ...dataUrls]);
    } catch (error: any) {
      showToast(error?.message || 'Failed to attach photo.', 'error');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div key={index} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label="Remove photo"
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {value.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            <Camera className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400">
        {value.length}/{MAX_PHOTOS} photos · JPG/PNG/WEBP, up to 2MB each
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
