import { describe, expect, it } from "vitest";

import { countReminders, getReminderState, matchesReminderFilter } from "./reminders";

const now = new Date("2026-10-12T12:00:00");
const at = (h: number) => new Date(now.getTime() + h * 3600_000).toISOString();

describe("reminder states", () => {
  it("pending and past its time is Overdue", () => {
    expect(getReminderState({ status: "Pending", due_at: at(-1) }, now)).toBe("Overdue");
  });
  it("pending within 24 hours is Due Soon", () => {
    expect(getReminderState({ status: "Pending", due_at: at(23) }, now)).toBe("Due Soon");
  });
  it("pending more than 24 hours away is Upcoming", () => {
    expect(getReminderState({ status: "Pending", due_at: at(25) }, now)).toBe("Upcoming");
  });
  it("a past follow-up is never auto-completed", () => {
    expect(getReminderState({ status: "Pending", due_at: at(-500) }, now)).not.toBe("Completed");
  });
  it("cancelled stays cancelled even when overdue", () => {
    expect(getReminderState({ status: "Cancelled", due_at: at(-5) }, now)).toBe("Cancelled");
  });
  it("counts only pending items and splits overdue / today / upcoming", () => {
    const items = [
      { status: "Pending", due_at: at(-2) }, // overdue, today
      { status: "Pending", due_at: at(3) }, // upcoming, today
      { status: "Pending", due_at: at(48) }, // upcoming
      { status: "Completed", due_at: at(-1) },
      { status: "Cancelled", due_at: at(1) },
    ];
    expect(countReminders(items, now)).toEqual({ pending: 3, overdue: 1, today: 2, upcoming: 2 });
  });
  it("today filter excludes tomorrow", () => {
    expect(matchesReminderFilter({ status: "Pending", due_at: at(13) }, "today", now)).toBe(false);
  });
});
