export interface PricingParams {
  wageAmount: number;
  nightShift: boolean;
  needsTools: boolean;
}

export interface InsuranceBreakdown {
  microInsurance: number;
}

export interface PricingResult {
  wageAmount: number;
  nightShiftAdd: number;
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

// Simplified constants for clarity
export const PLATFORM_FEE_PERCENT = 0.05; // 5% platform fee only
export const TOOL_ALLOWANCE_FLAT = 25000;
export const NIGHT_SHIFT_MULTIPLIER = 0.20;
export const MICRO_INSURANCE_DAILY = 3227;

/**
 * Simplified pricing engine for Kerjaharian
 * Designed for blue-collar workers to easily understand earnings
 */
export function calculateOrderPrice(params: PricingParams): PricingResult {
  const { wageAmount, nightShift, needsTools } = params;

  const nightShiftAdd = nightShift ? Math.round(wageAmount * NIGHT_SHIFT_MULTIPLIER) : 0;
  const toolAllowance = needsTools ? TOOL_ALLOWANCE_FLAT : 0;
  const baseWage = wageAmount + nightShiftAdd + toolAllowance;

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
