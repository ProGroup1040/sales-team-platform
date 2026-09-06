export type MoneyInput = number | string;

const DECIMAL_MONEY_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

/** Convert a valid DECIMAL(14,2)-compatible value to integer cents. */
export function toCents(value: MoneyInput): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid monetary value");
    return Math.round(value * 100);
  }

  const trimmed = value.trim();
  if (!DECIMAL_MONEY_PATTERN.test(trimmed)) throw new Error("Invalid monetary value");
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = unsigned.split(".");
  const cents = Number.parseInt(`${fraction}00`.slice(0, 2), 10);
  const total = Number.parseInt(whole, 10) * 100 + cents;
  return negative ? -total : total;
}

/** Convert integer cents to the external two-decimal monetary representation. */
export function fromCents(cents: number): string {
  if (!Number.isInteger(cents)) throw new Error("Money cents must be an integer");
  return (cents / 100).toFixed(2);
}

/** Convert integer cents to the existing numeric API representation at the boundary. */
export function centsToNumber(cents: number): number {
  return Number(fromCents(cents));
}

/** Parse nullable DECIMAL values as cents; nullish values are treated as zero. */
export function toCentsOrZero(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value !== "number" && typeof value !== "string") throw new Error("Invalid monetary value");
  return toCents(value);
}

/** Sum monetary values using integer cents only. */
export function sumCents(values: readonly unknown[]): number {
  return values.reduce<number>((total, value) => total + toCentsOrZero(value), 0);
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
