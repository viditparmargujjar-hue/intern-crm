/**
 * Shared CRM types, option lists and small helpers.
 * Keeping them in one file makes the rest of the app easy to read.
 */
import { format, parseISO, startOfToday } from "date-fns";

import type { Tables } from "@/integrations/supabase/types";

export type Lead = Tables<"leads">;
export type Customer = Tables<"customers">;
export type FollowUp = Tables<"follow_ups">;
export type Activity = Tables<"activities">;
export type AppUser = Tables<"users">;

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Follow-up",
  "Qualified",
  "Converted",
  "Lost",
] as const;

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Cold Email",
  "Event",
  "Webinar",
  "Other",
] as const;

export const FOLLOW_UP_TYPES = ["Call", "Email", "Meeting", "Other"] as const;

export const FOLLOW_UP_STATUSES = ["Pending", "Completed", "Cancelled"] as const;

export const PRIORITIES = ["Low", "Medium", "High"] as const;

/** Kanban columns, in order. */
export const PIPELINE_STAGES = ["New", "Contacted", "Follow-up", "Qualified", "Converted", "Lost"] as const;

export type Profile = Tables<"profiles">;
export type AppNotification = Tables<"notifications">;

export const CUSTOMER_STATUSES = ["Active", "Inactive"] as const;

export const ACTIVITY_TYPES = [
  "Call",
  "Email",
  "Meeting",
  "Note",
  "Status Change",
  "Follow-up Completed",
] as const;

/** Active date format, set from the signed-in user's CRM preferences. */
let activeDateFormat = "d MMM yyyy";

/** Called by the app shell when the user's preferences load. */
export function setDateFormat(dateFormat: string): void {
  activeDateFormat = dateFormat;
}

/** Formats a date stored as "2026-03-14" using the user's preferred format. */
export function formatDate(value: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), activeDateFormat);
  } catch {
    return value;
  }
}

/** Formats a timestamp into "14 Mar 2026, 10:30". */
export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy, HH:mm");
  } catch {
    return value;
  }
}

/** Today's date as "YYYY-MM-DD", handy for date inputs. */
export function todayISO(): string {
  return format(startOfToday(), "yyyy-MM-dd");
}

/** A pending follow-up is overdue when its date is in the past. */
export function isOverdue(followUp: FollowUp): boolean {
  if (followUp.status !== "Pending") return false;
  return new Date(followUp.due_at).getTime() <= Date.now();
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Downloads a list of leads as a CSV file (Excel-friendly).
 * Every value is quoted and escaped so commas in names or notes stay intact.
 */
export function exportLeadsToCsv(leads: Lead[]): void {
  const headers = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Source",
    "Status",
    "Assigned To",
    "Next Follow-up",
    "Notes",
    "Created",
  ];
  const escape = (value: string | null): string => `"${(value ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((lead) =>
    [
      lead.full_name,
      lead.company_name,
      lead.email,
      lead.phone,
      lead.lead_source,
      lead.status,
      lead.assigned_to,
      lead.next_follow_up,
      lead.notes,
      lead.created_at ? lead.created_at.slice(0, 10) : null,
    ]
      .map(escape)
      .join(","),
  );
  // BOM prefix keeps accents readable when opened in Excel.
  const csv = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `leads-${format(startOfToday(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
