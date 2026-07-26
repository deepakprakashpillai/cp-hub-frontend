import { describe, expect, it } from "vitest";

import { getPaymentRange } from "@/features/admin/AdminFinancePage";

describe("getPaymentRange", () => {
  it("does not apply a date filter for all-time finance history", () => {
    expect(getPaymentRange("all_time", null, null)).toEqual({});
  });

  it("converts a custom local date range into API timestamps", () => {
    expect(getPaymentRange("custom", "2026-07-01", "2026-07-31")).toEqual({
      from: new Date("2026-07-01T00:00:00").toISOString(),
      to: new Date("2026-07-31T00:00:00").toISOString(),
    });
  });
});
