'use client';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-rose-100 text-rose-800 border-rose-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function StatusBadge({
  label,
  tone = 'neutral'
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
