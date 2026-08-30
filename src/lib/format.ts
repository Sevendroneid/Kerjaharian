export const MIN_WAGE_DAILY = 75000;
export const MIN_WAGE_HOURLY = 12000;

const idrFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatIDR(value: number): string {
  return idrFormatter.format(Math.round(value));
}

export function formatCompactIDR(value: number): string {
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }
  return formatIDR(value);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export type WageType = 'hourly' | 'daily';

export function calculateWage(wagePerUnit: number, wageType: WageType, estimatedHours?: number): number {
  if (wageType === 'hourly') {
    return wagePerUnit * (estimatedHours ?? 1);
  }
  return wagePerUnit;
}
