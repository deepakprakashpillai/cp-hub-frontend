import { describe, expect, it } from "vitest";

import { getLeadFilters } from "@/features/leads/LeadsWorkspace";

describe("getLeadFilters", () => {
  it("reads supported URL filters and keeps the requested page", () => {
    expect(getLeadFilters(new URLSearchParams("q=Ada&status=trial_booked&page=3"))).toEqual({
      q: "Ada",
      status: "trial_booked",
      page: 3,
      pageSize: 25,
    });
  });

  it("falls back to the first page and ignores unknown statuses", () => {
    expect(getLeadFilters(new URLSearchParams("status=unknown&page=-4"))).toEqual({
      q: "",
      status: undefined,
      page: 1,
      pageSize: 25,
    });
  });
});
