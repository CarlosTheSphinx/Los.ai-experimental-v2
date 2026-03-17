import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function safeDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(dateStr: string | number | Date | null | undefined): string {
  const d = safeDate(dateStr);
  if (!d) return '—';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} · ${time}`;
}

export function formatDate(value: string | number | Date | null | undefined, fallback = '—'): string {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateFull(value: string | number | Date | null | undefined, options?: Intl.DateTimeFormatOptions, fallback = '—'): string {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(value: string | number | Date | null | undefined, fallback = '—'): string {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatTimestamp(value: string | number | Date | null | undefined, fallback = '—'): string {
  const d = safeDate(value);
  if (!d) return fallback;
  return d.toLocaleString('en-US');
}
