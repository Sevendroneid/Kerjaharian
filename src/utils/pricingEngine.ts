export interface PricingParams {
  wageAmount: number;
  nightShift: boolean;
  /** Informational employer suggestion only. It must never change the price. */
  needsTools: boolean;
}

export interface InsuranceBreakdown {
  microInsurance: number;
}

export interface PricingResult {
  wageAmount: number;
  nightShiftAdd: number;
  /** Always zero: tools are informational only and are not an employer/worker charge. */
  toolAllowance: number;
  baseWage: number;
  platformFee: number;
  insurance: InsuranceBreakdown;
  totalPrice: number;
  breakdown: {
    wage: number;
    fee: number;
    insurance: number;
  };
}

// KerjaHarian pricing rules
export const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee only
export const NIGHT_SHIFT_MULTIPLIER = 0.20;
export const NIGHT_SHIFT_START_HOUR = 21;
export const NIGHT_SHIFT_END_HOUR = 6;
export const MICRO_INSURANCE_DAILY = 3227;

/**
 * Night shift is defined by the actual job start clock: 21:00 through 05:59.
 * The server/timer should use the actual started_at timestamp as its source of truth.
 */
export function isNightShiftStart(date: Date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= NIGHT_SHIFT_START_HOUR || hour < NIGHT_SHIFT_END_HOUR;
}

/**
 * Simplified pricing engine for KerjaHarian.
 * Tools are an informational employer suggestion only and never affect worker pay,
 * platform fees, insurance, or the published total.
 */
export function calculateOrderPrice(params: PricingParams): PricingResult {
  const { wageAmount, nightShift } = params;

  const nightShiftAdd = nightShift ? Math.round(wageAmount * NIGHT_SHIFT_MULTIPLIER) : 0;
  // IMPORTANT: needsTools is deliberately ignored financially.
  const toolAllowance = 0;
  const baseWage = wageAmount + nightShiftAdd;

  const platformFee = Math.round(baseWage * PLATFORM_FEE_PERCENT);
  const insurance = { microInsurance: MICRO_INSURANCE_DAILY };

  const totalPrice = Math.round((baseWage + platformFee + insurance.microInsurance) / 1000) * 1000;

  return {
    wageAmount,
    nightShiftAdd,
    toolAllowance,
    baseWage,
    platformFee,
    insurance,
    totalPrice,
    breakdown: {
      wage: baseWage,
      fee: platformFee,
      insurance: insurance.microInsurance,
    },
  };
}
