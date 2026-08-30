interface PricingParams {
  base4h: number;
  hourlyRate: number;
  hours: number;
  nightShift: boolean;
  toolAllowance: number;
  physicalLoad: boolean;
  adminPercent: number;
  vatPercent: number;
}

interface InsuranceBreakdown {
  bpjsCoverage: number;
  fwdCoverage: number;
  totalMicroInsurance: number;
}

const BPJS_MONTHLY_PREMIUM = 16800;
const FWD_MONTHLY_PREMIUM = 54000;
const AVG_SHIFTS_PER_MONTH = 22;

function calculateInsurance(): InsuranceBreakdown {
  const bpjsCoverage = Math.round(BPJS_MONTHLY_PREMIUM / AVG_SHIFTS_PER_MONTH);
  const fwdCoverage = Math.round(FWD_MONTHLY_PREMIUM / AVG_SHIFTS_PER_MONTH);
  return {
    bpjsCoverage,
    fwdCoverage,
    totalMicroInsurance: bpjsCoverage + fwdCoverage,
  };
}

export function calculateOrderPrice(params: PricingParams) {
  const extraHours = Math.max(0, params.hours - 4);
  let wageBeforeModifiers = params.base4h + extraHours * params.hourlyRate;
  const nightShiftAdd = params.nightShift ? wageBeforeModifiers * 0.2 : 0;
  const physicalLoadAdd = params.physicalLoad ? wageBeforeModifiers * 0.15 : 0;
  const baseWage =
    wageBeforeModifiers +
    nightShiftAdd +
    physicalLoadAdd +
    params.toolAllowance;
  const adminFee = baseWage * params.adminPercent;
  const ppn = adminFee * params.vatPercent;
  const insurance = calculateInsurance();
  const totalPrice = baseWage + adminFee + ppn + insurance.totalMicroInsurance;

  return {
    wageBeforeModifiers,
    nightShiftAdd,
    physicalLoadAdd,
    toolAllowance: params.toolAllowance,
    baseWage,
    adminFee,
    ppn,
    insurance,
    totalPrice,
  };
}
