import { format } from "date-fns";

export type HistoryEntry = {
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewer_email: string | null;
  status: string;
  reviewed_at: string;
};

export type HistoryFilters = {
  admin: string;
  outcome: string;
  from: string;
  to: string;
};

export const EMPTY_HISTORY_FILTERS: HistoryFilters = { admin: "all", outcome: "all", from: "", to: "" };

export function reviewerKey(entry: HistoryEntry): string {
  return entry.reviewed_by ?? entry.reviewer_email ?? entry.reviewer_name ?? "unavailable";
}

/** Combine filters; date boundaries include the entire day in the viewer's timezone. */
export function filterRegistrationHistory<T extends HistoryEntry>(entries: T[], filters: HistoryFilters): T[] {
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return entries.filter((entry) => {
    if (filters.admin !== "all" && reviewerKey(entry) !== filters.admin) return false;
    if (filters.outcome !== "all" && entry.status !== filters.outcome) return false;
    if (!filters.from && !filters.to) return true;
    const date = new Date(entry.reviewed_at);
    if (Number.isNaN(date.getTime())) return false;
    const day = format(date, "yyyy-MM-dd");
    return (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to);
  });
}