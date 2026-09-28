import { describe, expect, test } from "bun:test";
import { AppError } from "@/lib/server/http";
import { resolveMetricsPeriod } from "@/modules/analytics/server/service";

const now = new Date("2026-09-28T16:00:00.000Z");

describe("período das estatísticas", () => {
  test("Free usa e preserva no máximo os últimos sete dias", () => {
    expect(resolveMetricsPeriod({ metricsHistoryDays: 7 }, {}, now)).toMatchObject({
      fromKey: "2026-09-22",
      toKey: "2026-09-28",
      availableFromKey: "2026-09-22",
      availableToKey: "2026-09-28",
      interval: "DAY",
    });

    expect(
      resolveMetricsPeriod({ metricsHistoryDays: 7 }, { from: "2026-01-01", to: "2026-09-28" }, now)
        .fromKey
    ).toBe("2026-09-22");
  });

  test("planos pagos abrem no mês atual e agregam períodos longos por mês", () => {
    expect(resolveMetricsPeriod({ metricsHistoryDays: null }, {}, now)).toMatchObject({
      fromKey: "2026-09-01",
      toKey: "2026-09-28",
      availableFromKey: null,
      interval: "DAY",
    });

    expect(
      resolveMetricsPeriod(
        { metricsHistoryDays: null },
        { from: "2026-01-01", to: "2026-09-28" },
        now
      ).interval
    ).toBe("MONTH");
  });

  test("recusa datas invertidas ou futuras", () => {
    for (const query of [
      { from: "2026-09-28", to: "2026-09-27" },
      { from: "2026-09-28", to: "2026-09-29" },
    ]) {
      expect(() => resolveMetricsPeriod({ metricsHistoryDays: null }, query, now)).toThrow(
        AppError
      );
    }
  });
});
