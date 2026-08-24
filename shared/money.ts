export type MoneyInput = number | string;

export function toCents(value: MoneyInput): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) throw new Error("Invalid monetary value");
  return Math.round(numeric * 100);
}

export function fromCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Money cents must be an integer");
  return (cents / 100).toFixed(2);
}

export function addMoney(...values: MoneyInput[]): string {
  return fromCents(values.reduce<number>((total, value) => total + toCents(value), 0));
}

export function subtractMoney(minuend: MoneyInput, subtrahend: MoneyInput): string {
  const result = toCents(minuend) - toCents(subtrahend);
  if (result < 0) throw new Error("Money result cannot be negative");
  return fromCents(result);
}

export function percentOfMoney(value: MoneyInput, percentage: number): string {
  if (!Number.isFinite(percentage) || percentage < 0) throw new Error("Invalid percentage");
  return fromCents(Math.round(toCents(value) * percentage / 100));
}
