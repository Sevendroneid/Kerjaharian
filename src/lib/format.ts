export const MIN_WAGE_DAILY = 75000;
export const MIN_WAGE_HOURLY = 12000;

const idrFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export function formatIDR(value: number): string { return idrFormatter.format(Math.round(value)); }
export function formatCompactIDR(value: number): string {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return formatIDR(value);
}
export function formatDistance(meters: number): string { return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`; }

export function timeAgo(value: Date | string | number | null | undefined, lang: 'id' | 'en' = 'id'): string {
  const id = lang === 'id';
  if (value === null || value === undefined || value === '') return id ? 'baru saja' : 'just now';
  const date = value instanceof Date ? value : new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return id ? 'baru saja' : 'just now';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return id ? 'baru saja' : 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return id ? `${minutes} menit lalu` : `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return id ? `${hours} jam lalu` : `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return id ? `${days} hari lalu` : `${days} day${days === 1 ? '' : 's'} ago`;
}

export type WageType = 'hourly' | 'daily';
export function calculateWage(wagePerUnit: number, wageType: WageType, estimatedHours?: number): number {
  return wageType === 'hourly' ? wagePerUnit * (estimatedHours ?? 1) : wagePerUnit;
}
