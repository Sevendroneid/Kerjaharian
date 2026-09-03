export interface JobTimingConfig {
  durationMinutes: number;
  basePrice: number;
  overtimeRatePerMinute: number;
  alertBeforeMinutes?: number;
}

export interface JobTimingState {
  startedAt: string;
  scheduledEndAt: string;
  now?: string;
}

export interface JobTimingResult {
  elapsedMinutes: number;
  remainingMinutes: number;
  overtimeMinutes: number;
  isOvertime: boolean;
  isAlert: boolean;
  isFinished: boolean;
  overtimeAmount: number;
}

/**
 * KerjaHarian timer engine.
 * The database scheduled_end_at is the authoritative deal boundary.
 * Whole minutes after that boundary become overtime.
 */
export function calculateJobTiming(
  config: JobTimingConfig,
  state: JobTimingState,
): JobTimingResult {
  const duration = Math.max(0, Math.floor(config.durationMinutes));
  const alertBefore = Math.max(0, Math.floor(config.alertBeforeMinutes ?? 15));
  const overtimeRate = Math.max(0, config.overtimeRatePerMinute);
  const started = new Date(state.startedAt).getTime();
  const scheduledEnd = new Date(state.scheduledEndAt).getTime();
  const now = new Date(state.now ?? new Date().toISOString()).getTime();

  if (!Number.isFinite(started) || !Number.isFinite(scheduledEnd) || !Number.isFinite(now)) {
    throw new Error('Invalid job timing timestamp');
  }

  const elapsedMinutes = Math.max(0, Math.floor((now - started) / 60000));
  const remainingMinutes = Math.max(0, Math.ceil((scheduledEnd - now) / 60000));
  const overtimeMinutes = Math.max(0, Math.floor((now - scheduledEnd) / 60000));

  return {
    elapsedMinutes,
    remainingMinutes,
    overtimeMinutes,
    isOvertime: overtimeMinutes > 0,
    isAlert: now < scheduledEnd && remainingMinutes > 0 && remainingMinutes <= alertBefore,
    isFinished: now >= scheduledEnd,
    overtimeAmount: overtimeMinutes * overtimeRate,
  };
}

export function createJobTimingState(startedAt: string, durationMinutes: number) {
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start)) throw new Error('Invalid startedAt timestamp');
  return {
    startedAt,
    scheduledEndAt: new Date(start + Math.max(0, durationMinutes) * 60000).toISOString(),
  };
}
