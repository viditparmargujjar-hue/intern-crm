/**
 * Reminder states are derived from the stored time + status — never persisted,
 * so a follow-up is never "completed" just because its time passed.
 */
import { endOfDay, isSameDay, startOfDay } from "date-fns";

export type ReminderState = "Upcoming" | "Due Soon" | "Overdue" | "Completed" | "Cancelled";

/** A pending follow-up within this window is "Due Soon". */
export const DUE_SOON_HOURS = 24;

export interface ReminderInput {
  status: string;
  due_at: string;
}

export function getReminderState(f: ReminderInput, now: Date = new Date()): ReminderState {
  if (f.status === "Completed") return "Completed";
  if (f.status === "Cancelled") return "Cancelled";
  const due = new Date(f.due_at).getTime();
  const t = now.getTime();
  if (due <= t) return "Overdue";
  if (due - t <= DUE_SOON_HOURS * 3600_000) return "Due Soon";
  return "Upcoming";
}

/** Pending and scheduled within the viewer's local calendar day. */
export function isDueToday(f: ReminderInput, now: Date = new Date()): boolean {
  if (f.status !== "Pending") return false;
  const due = new Date(f.due_at);
  return isSameDay(due, now) && due >= startOfDay(now) && due <= endOfDay(now);
}

export interface ReminderCounts {
  pending: number;
  overdue: number;
  today: number;
  upcoming: number;
}

export function countReminders(items: ReminderInput[], now: Date = new Date()): ReminderCounts {
  const c: ReminderCounts = { pending: 0, overdue: 0, today: 0, upcoming: 0 };
  for (const f of items) {
    if (f.status !== "Pending") continue;
    c.pending++;
    const s = getReminderState(f, now);
    if (s === "Overdue") c.overdue++;
    else c.upcoming++;
    if (isDueToday(f, now)) c.today++;
  }
  return c;
}

/** Filter keys used in the Follow-ups page URL (?state=...). */
export const REMINDER_FILTERS = ["pending", "overdue", "today", "upcoming", "due_soon", "completed", "cancelled"] as const;
export type ReminderFilter = (typeof REMINDER_FILTERS)[number];

export function matchesReminderFilter(f: ReminderInput, filter: ReminderFilter, now: Date = new Date()): boolean {
  const s = getReminderState(f, now);
  switch (filter) {
    case "pending":
      return f.status === "Pending";
    case "overdue":
      return s === "Overdue";
    case "today":
      return isDueToday(f, now);
    case "upcoming":
      return f.status === "Pending" && s !== "Overdue";
    case "due_soon":
      return s === "Due Soon";
    case "completed":
      return s === "Completed";
    case "cancelled":
      return s === "Cancelled";
  }
}

/** Combines a local date ("2026-10-12") and time ("14:30") into an ISO timestamp. */
export function toDueAt(date: string, time: string): string {
  return new Date(`${date}T${time || "10:00"}:00`).toISOString();
}
