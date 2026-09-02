export interface JobBillingInput {
  workerBaseAmount: number;
  overtimeAmount: number;
  platformFee: number;
  protectionFee: number;
  taxAmount: number;
}

export interface JobBillingResult {
  workerBaseAmount: number;
  overtimeAmount: number;
  workerAmount: number;
  platformFee: number;
  protectionFee: number;
  taxAmount: number;
  employerTotal: number;
}

/**
 * KerjaHarian Model D:
 * the worker's earnings are never reduced by the platform fee.
 * Employer-paid costs are added on top of worker earnings.
 */
export function calculateJobBilling(input: JobBillingInput): JobBillingResult {
  const workerBaseAmount = Math.max(0, Math.floor(input.workerBaseAmount));
  const overtimeAmount = Math.max(0, Math.floor(input.overtimeAmount));
  const platformFee = Math.max(0, Math.floor(input.platformFee));
  const protectionFee = Math.max(0, Math.floor(input.protectionFee));
  const taxAmount = Math.max(0, Math.floor(input.taxAmount));
  const workerAmount = workerBaseAmount + overtimeAmount;

  return {
    workerBaseAmount,
    overtimeAmount,
    workerAmount,
    platformFee,
    protectionFee,
    taxAmount,
    employerTotal: workerAmount + platformFee + protectionFee + taxAmount,
  };
}
