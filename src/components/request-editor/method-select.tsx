'use client';

import { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
type Method = (typeof METHODS)[number];

const METHOD_COLOR: Record<Method, string> = {
  GET: 'text-emerald-600 dark:text-emerald-400',
  POST: 'text-sky-600 dark:text-sky-400',
  PUT: 'text-amber-600 dark:text-amber-400',
  PATCH: 'text-violet-600 dark:text-violet-400',
  DELETE: 'text-rose-600 dark:text-rose-400',
  HEAD: 'text-slate-500',
  OPTIONS: 'text-slate-500',
};

export function MethodSelect({
  value,
  onChange,
  className,
}: {
  value: Method;
  onChange: (m: Method) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Method)}
      aria-label="HTTP method"
      className={cn(
        'h-8 rounded-md border border-input bg-background px-2 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        METHOD_COLOR[value],
        className,
      )}
    >
      {METHODS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );
}

export type { Method as HttpMethodChoice };
export { METHODS as HTTP_METHODS };
export type { SelectHTMLAttributes };
