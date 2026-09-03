import { fromCents, toCents } from "./money";

export type AvailableCashInputs = {
  currentCash: string | number | null | undefined;
  confirmedIncoming: string | number | null | undefined;
  dueCommitments: string | number | null | undefined;
  forecast?: string | number | null | undefined;
};

/**
 * Available Cash intentionally ignores forecast. Forecast represents commercial
 * potential, not an established or received cash flow.
 */
export function calculateAvailableCash(inputs: AvailableCashInputs): number {
  const currentCashCents = toCents(inputs.currentCash ?? 0);
  const confirmedIncomingCents = toCents(inputs.confirmedIncoming ?? 0);
  const dueCommitmentsCents = toCents(inputs.dueCommitments ?? 0);
  return Number(fromCents(currentCashCents + confirmedIncomingCents - dueCommitmentsCents));
}

/** Existing forecast formula, deliberately separate from Available Cash. */
export function calculateExpectedSales(plannedVisits: number, conversionRatePercent: number, averageDealValue: string | number | null | undefined): number {
  const visits = Number.isFinite(plannedVisits) && plannedVisits > 0 ? plannedVisits : 0;
  const rate = Number.isFinite(conversionRatePercent) && conversionRatePercent > 0 ? conversionRatePercent / 100 : 0;
  const averageDealCents = toCents(averageDealValue ?? 0);
  return Number(fromCents(Math.round(visits * rate * averageDealCents)));
}
