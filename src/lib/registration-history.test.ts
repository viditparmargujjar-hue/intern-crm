import { describe, expect, it } from "vitest";
import { EMPTY_HISTORY_FILTERS, filterRegistrationHistory } from "./registration-history";

const entries = [
  { reviewed_by: "admin-a", reviewer_name: "Alex", reviewer_email: "a@example.test", status: "approved", reviewed_at: new Date(2026, 10, 9, 0, 0).toISOString() },
  { reviewed_by: "admin-b", reviewer_name: "Alex", reviewer_email: "b@example.test", status: "rejected", reviewed_at: new Date(2026, 10, 9, 23, 59, 59).toISOString() },
  { reviewed_by: "admin-a", reviewer_name: "Alex", reviewer_email: "a@example.test", status: "rejected", reviewed_at: new Date(2026, 10, 10, 0, 0).toISOString() },
];

describe("registration review-history filters", () => {
  it("filters by admin identity even when names are identical", () => {
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, admin: "admin-b" })).toEqual([entries[1]]);
  });
  it("filters approved and rejected outcomes", () => {
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, outcome: "approved" })).toEqual([entries[0]]);
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, outcome: "rejected" })).toEqual([entries[1], entries[2]]);
  });
  it("includes both date boundaries and excludes the next day", () => {
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, from: "2026-11-09", to: "2026-11-09" })).toEqual([entries[0], entries[1]]);
  });
  it("supports open-ended date ranges", () => {
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, from: "2026-11-10" })).toEqual([entries[2]]);
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, to: "2026-11-09" })).toEqual([entries[0], entries[1]]);
  });
  it("combines all filters and restores every entry when cleared", () => {
    expect(filterRegistrationHistory(entries, { admin: "admin-a", outcome: "rejected", from: "2026-11-09", to: "2026-11-09" })).toEqual([]);
    expect(filterRegistrationHistory(entries, EMPTY_HISTORY_FILTERS)).toEqual(entries);
  });
  it("returns no entries for an inverted range", () => {
    expect(filterRegistrationHistory(entries, { ...EMPTY_HISTORY_FILTERS, from: "2026-11-10", to: "2026-11-09" })).toEqual([]);
  });
});