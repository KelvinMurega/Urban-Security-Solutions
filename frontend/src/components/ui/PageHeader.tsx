'use client';

import { ReactNode } from 'react';

export default function PageHeader({
  title,
  subtitle,
  right
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-gray-500 mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="w-full md:w-auto">{right}</div> : null}
    </div>
  );
}
