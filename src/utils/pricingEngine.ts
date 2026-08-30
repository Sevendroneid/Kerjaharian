export interface PricingParams {
  wageAmount: number;
  nightShift: boolean;
  needsTools: boolean;
  adminPercent?: number;
  vatPercent?: number;
}

export interface InsuranceBreakdown {
  bpjsCoverage: number;
  fwdCoverage: number;
  totalMicroInsurance: number;
}

export interface PricingResult {
  wageAmount: number;
  nightShiftAdd: number;
  toolAllowance: number;
  baseWage: number;
  adminFee: number;
  ppn: number;
  insurance: InsuranceBreakdown;
  totalPrice: number;
}

export const ADMIN_PERCENT = 0.10;
export const VAT_PERCENT = 0.11;
export const TOOL_ALLOWANCE_FLAT = 25000;
export const NIGHT_SHIFT_MULTIPLIER = 0.20;

const BPJS_MONTHLY_PREMIUM = 16800;
const FWD_MONTHLY_PREMIUM = 54000;
const AVG_SHIFTS_PER_MONTH = 22;

function calculateInsurance(): InsuranceBreakdown {
  const bpjsCoverage = Math.round(BPJS_MONTHLY_PREMIUM / AVG_SHIFTS_PER_MONTH);
  const fwdCoverage = Math.round(FWD_MONTHLY_PREMIUM / AVG_SHIFTS_PER_MONTH);
  return { bpjsCoverage, fwdCoverage, totalMicroInsurance: bpjsCoverage + fwdCoverage };
}

export function calculateOrderPrice(params: PricingParams): PricingResult {
  const adminPercent = params.adminPercent ?? ADMIN_PERCENT;
  const vatPercent = params.vatPercent ?? VAT_PERCENT;

  const nightShiftAdd = params.nightShift ? params.wageAmount * NIGHT_SHIFT_MULTIPLIER : 0;
  const toolAllowance = params.needsTools ? TOOL_ALLOWANCE_FLAT : 0;
  const baseWage = params.wageAmount + nightShiftAdd + toolAllowance;

  const adminFee = baseWage * adminPercent;
  const ppn = adminFee * vatPercent;
  const insurance = calculateInsurance();
  const totalPrice = baseWage + adminFee + ppn + insurance.totalMicroInsurance;

  return { wageAmount: params.wageAmount, nightShiftAdd, toolAllowance, baseWage, adminFee, ppn, insurance, totalPrice };
}2
