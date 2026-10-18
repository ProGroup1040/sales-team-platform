import { describe, expect, it } from "vitest";
import { escapeCsvCell, serializeCsv, spreadsheetSafeCell } from "../shared/csv";

describe("CSV spreadsheet formula protection", () => {
  it.each([
    "=1+1",
    "+1+1",
    "-1+1",
    "@SUM(1,1)",
    " =HYPERLINK(\"https://example.test\",\"x\")",
    "\t=HYPERLINK(\"https://example.test\",\"x\")",
  ])("neutralizes a potentially executable spreadsheet cell: %s", (value) => {
    expect(spreadsheetSafeCell(value)).toBe(`'${value}`);
  });

  it("preserves ordinary values while retaining valid CSV quoting", () => {
    expect(spreadsheetSafeCell("عميل, \"مهم\"\nجديد")).toBe("عميل, \"مهم\"\nجديد");
    expect(escapeCsvCell('عميل, "مهم"')).toBe('"عميل, ""مهم"""');
    expect(serializeCsv([["العميل", "قيمة"], ["عميل", 1250]])).toBe("\uFEFF\"العميل\",\"قيمة\"\n\"عميل\",\"1250\"");
  });

  it("serializes a formula-looking client name as text", () => {
    const csv = serializeCsv([["العميل"], ["=HYPERLINK(\"https://example.test\",\"x\")"]]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"https://example.test\"\",\"\"x\"\")\"");
  });
});
