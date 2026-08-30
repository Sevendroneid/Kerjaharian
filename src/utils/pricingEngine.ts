interface PricingParams {
  base4h: number;
  hourlyRate: number;
  hours: number;
  nightShift: boolean;
  toolAllowance: number;
  physicalLoad: boolean;
  adminPercent: number; // e.g. 0.10
  vatPercent: number;    // e.g. 0.11
  insuranceFee: number;  // e.g. 1000
}

export function calculateOrderPrice(params: PricingParams) {
  const extraHours = Math.max(0, params.hours - 4);
  let baseWage = params.base4h + (extraHours * params.hourlyRate);

  if (params.nightShift) baseWage += baseWage * 0.20;
  if (params.physicalLoad) baseWage += baseWage * 0.15;
  baseWage += params.toolAllowance;

  const adminFee = baseWage * params.adminPercent;
  const ppn = adminFee * params.vatPercent;
  const insurance = params.insuranceFee;
  const totalPrice = baseWage + adminFee + ppn + insurance;

  return { baseWage, adminFee, ppn, insurance, totalPrice };
}
