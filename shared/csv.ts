export type CsvCell = string | number | null | undefined;

const SPREADSHEET_FORMULA_PREFIX = /^[\u0009\u000A\u000D ]*[=+\-@]/;

/**
 * Neutralizes spreadsheet formulas without changing the stored application data.
 * CSV consumers such as Excel may evaluate a cell even when it is CSV-quoted.
 */
export function spreadsheetSafeCell(value: CsvCell): string {
  const text = String(value ?? "");
  return SPREADSHEET_FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function escapeCsvCell(value: CsvCell): string {
  return `"${spreadsheetSafeCell(value).replace(/"/g, '""')}"`;
}

export function serializeCsv(rows: CsvCell[][]): string {
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")}`;
}
