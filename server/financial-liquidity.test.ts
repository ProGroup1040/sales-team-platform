import { describe, expect, it } from "vitest";
import { calculateAvailableCash, calculateExpectedSales } from "../shared/financialLiquidity";

describe("Financial liquidity separation", () => {
  it("يحسب السيولة المتاحة من النقد الفعلي والتدفقات المؤكدة والالتزامات فقط", () => {
    expect(calculateAvailableCash({ currentCash: 1_000_000, confirmedIncoming: 200_000, dueCommitments: 350_000 })).toBe(850_000);
  });

  it("لا يضيف Sales Forecast إلى السيولة المتاحة تحت أي ظرف", () => {
    const withoutForecast = calculateAvailableCash({ currentCash: 100_000, confirmedIncoming: 50_000, dueCommitments: 20_000 });
    const withForecast = calculateAvailableCash({ currentCash: 100_000, confirmedIncoming: 50_000, dueCommitments: 20_000, forecast: 9_999_999 });
    expect(withForecast).toBe(130_000);
    expect(withForecast).toBe(withoutForecast);
  });

  it("يبقي معادلة Sales Forecast مستقلة", () => {
    expect(calculateExpectedSales(64, 50, 250_000)).toBe(8_000_000);
  });

  it("يحافظ على دقة القروش في معادلة السيولة", () => {
    expect(calculateAvailableCash({ currentCash: "10.15", confirmedIncoming: "0.10", dueCommitments: "0.25" })).toBe(10);
  });
});
